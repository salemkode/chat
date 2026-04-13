#!/usr/bin/env node
/**
 * Grouped commits → changelog commit → push.
 * Works from any terminal (Cursor, Codex CLI, OpenCode, CI) — no IDE APIs.
 *
 * Usage:
 *   pnpm run ship
 *   pnpm run ship -- --dry-run
 *   pnpm run ship -- --no-push
 *   SHIP_INTERACTIVE=1 pnpm run ship   # prompt for each commit message
 *
 * Env:
 *   SHIP_INTERACTIVE=1  - prompt for commit messages (default off)
 *   SHIP_PUSH=0         - same as --no-push
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin as input } from 'node:process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHANGELOG = path.join(REPO_ROOT, 'CHANGELOG.md')

/** @type {Array<{ id: string; label: string; prefixes: string[] }>} */
const SLICES = [
  { id: 'convex', label: 'Convex backend', prefixes: ['convex/'] },
  { id: 'packages', label: 'Shared packages', prefixes: ['packages/'] },
  { id: 'services', label: 'Services', prefixes: ['services/'] },
  { id: 'web', label: 'Web app', prefixes: ['apps/web/'] },
  { id: 'mobile', label: 'Mobile app', prefixes: ['apps/mobile/'] },
  { id: 'sandbox-server', label: 'Sandbox server', prefixes: ['apps/sandbox-server/'] },
  { id: 'docs', label: 'Docs', prefixes: ['docs/'] },
  {
    id: 'repo',
    label: 'Repo / tooling',
    prefixes: [],
  },
]

function git(args, opts = {}) {
  execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: opts.silent ? 'pipe' : 'inherit',
    ...opts,
  })
}

function gitOut(args) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trimEnd()
}

function parseArgs(argv) {
  const flags = { dryRun: false, noPush: false }
  for (const a of argv) {
    if (a === '--dry-run' || a === '-n') flags.dryRun = true
    if (a === '--no-push') flags.noPush = true
  }
  if (process.env.SHIP_PUSH === '0') flags.noPush = true
  return flags
}

function getPorcelainPaths() {
  const raw = gitOut(['status', '--porcelain'])
  if (!raw) return []
  const paths = []
  for (const line of raw.split('\n')) {
    if (!line) continue
    const body = line.slice(3)
    if (body.includes(' -> ')) {
      const parts = body.split(' -> ')
      paths.push(parts[parts.length - 1].trim())
    } else {
      paths.push(body.trim())
    }
  }
  return [...new Set(paths)]
}

/**
 * @param {string} file
 * @returns {string}
 */
function sliceFor(file) {
  for (const s of SLICES) {
    if (s.id === 'repo') continue
    if (s.prefixes.some((p) => file === p || file.startsWith(p))) {
      return s.id
    }
  }
  return 'repo'
}

/**
 * @param {string[]} files
 * @returns {Map<string, string[]>}
 */
function bucket(files) {
  /** @type {Map<string, string[]>} */
  const m = new Map()
  for (const f of files) {
    const id = sliceFor(f)
    const arr = m.get(id) ?? []
    arr.push(f)
    m.set(id, arr)
  }
  return m
}

function defaultMessage(sliceId, paths) {
  const top = paths
    .slice(0, 3)
    .map((p) => path.basename(p))
    .join(', ')
  const extra = paths.length > 3 ? ` (+${paths.length - 3} more)` : ''
  return `chore(${sliceId}): sync ${top}${extra}`
}

/**
 * @param {{ id: string; label: string; prefixes: string[] }} slice
 * @param {string[]} paths
 */
async function promptMessage(slice, paths) {
  const rl = createInterface({ input, terminal: true })
  const suggestion = defaultMessage(slice.id, paths)
  try {
    const ans = await rl.question(`Commit [${slice.label}]\nMessage [${suggestion}]: `)
    const trimmed = ans.trim()
    return trimmed || suggestion
  } finally {
    rl.close()
  }
}

/**
 * @param {string[]} entries
 */
function appendChangelog(entries) {
  const when = new Date().toISOString().slice(0, 10)
  const block = `## ${when}\n\n${entries.map((l) => `- ${l}`).join('\n')}\n\n`
  let body = fs.existsSync(CHANGELOG) ? fs.readFileSync(CHANGELOG, 'utf8') : ''
  if (!body.trim()) {
    body = `# Changelog\n\nShipped changes from \`pnpm run ship\`.\n\n`
  } else if (!body.startsWith('# Changelog')) {
    body = `# Changelog\n\n${body}`
  }
  const idx = body.search(/\n## /)
  const insertPoint = idx === -1 ? body.length : idx + 1
  const next = body.slice(0, insertPoint) + block + body.slice(insertPoint)
  fs.writeFileSync(CHANGELOG, next, 'utf8')
}

function commitMsgFailed(r) {
  const out = `${r.stderr || ''}${r.stdout || ''}`
  return /nothing to commit/i.test(out)
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  const interactive =
    process.env.SHIP_INTERACTIVE === '1' || process.env.SHIP_INTERACTIVE === 'true'

  const headBefore = gitOut(['rev-parse', 'HEAD'])

  const allPaths = getPorcelainPaths()
  const changed = allPaths.filter((f) => f !== 'CHANGELOG.md')
  if (allPaths.length === 0) {
    console.log('ship: nothing to commit.')
    return
  }
  if (changed.length === 0) {
    console.log(
      'ship: only CHANGELOG.md is modified — stage other work first, or commit the changelog yourself.',
    )
    return
  }

  const buckets = bucket(changed)
  const order = SLICES.map((s) => s.id).filter((id) => buckets.has(id))

  console.log(`ship: ${changed.length} file(s) in ${order.length} group(s): ${order.join(', ')}`)
  if (flags.dryRun) {
    for (const id of order) {
      console.log(`\n[${id}]`)
      for (const p of buckets.get(id) ?? []) console.log(`  ${p}`)
    }
    console.log('\n(dry-run: no commits)')
    return
  }

  for (const id of order) {
    const slice = SLICES.find((s) => s.id === id)
    const paths = buckets.get(id) ?? []
    if (!slice) continue

    git(['add', '--', ...paths])
    const staged = gitOut(['diff', '--cached', '--name-only'])
    if (!staged) continue

    const msg = interactive ? await promptMessage(slice, paths) : defaultMessage(id, paths)

    const r = spawnSync('git', ['commit', '-m', msg], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    if (r.status !== 0) {
      if (commitMsgFailed(r)) continue
      process.stderr.write(r.stderr || '')
      process.exit(r.status ?? 1)
    }
  }

  const headAfter = gitOut(['rev-parse', 'HEAD'])
  if (headAfter === headBefore) {
    console.log('ship: no new commits.')
    return
  }

  const range = `${headBefore}..HEAD`
  const summary = gitOut(['log', range, '--oneline']).split('\n').filter(Boolean)

  appendChangelog(summary)
  git(['add', 'CHANGELOG.md'])
  const cr = spawnSync('git', ['commit', '-m', 'docs(changelog): record ship'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
  if (cr.status !== 0) {
    if (!commitMsgFailed(cr)) {
      process.stderr.write(cr.stderr || '')
      process.exit(cr.status ?? 1)
    }
  }

  if (!flags.noPush) {
    git(['push'])
  } else {
    console.log('ship: skipped push (--no-push).')
  }

  console.log('ship: done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
