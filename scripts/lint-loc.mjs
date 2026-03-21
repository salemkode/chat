#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const WARN_THRESHOLD = 500
const MAX_THRESHOLD = 700
const strict = process.argv.includes('--strict')

const excludes = [
  'convex/_generated/',
  'dist/',
  '.output/',
  'node_modules/',
  't3code/',
]
const baselinePath = 'scripts/lint-loc-baseline.json'
const baselineExcludes = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, 'utf8'))
  : []

const rg = spawnSync(
  'rg',
  ['--files', '-g', '*.ts', '-g', '*.tsx', '-g', '!*.d.ts'],
  { encoding: 'utf8' },
)

if (rg.status !== 0) {
  console.error('Failed to list files with rg.')
  process.exit(1)
}

const files = rg.stdout
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => !excludes.some((prefix) => file.startsWith(prefix)))
  .filter((file) => !baselineExcludes.includes(file))

const warnings = []
const critical = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n').length

  if (lines > MAX_THRESHOLD) {
    critical.push({ file, lines })
  } else if (lines > WARN_THRESHOLD) {
    warnings.push({ file, lines })
  }
}

warnings.sort((a, b) => b.lines - a.lines)
critical.sort((a, b) => b.lines - a.lines)

if (warnings.length === 0 && critical.length === 0) {
  console.log('lint:loc: all files are within target limits.')
  process.exit(0)
}

if (warnings.length > 0) {
  console.log(`lint:loc: ${warnings.length} file(s) above ${WARN_THRESHOLD} lines:`)
  for (const item of warnings) {
    console.log(`  WARN  ${item.lines.toString().padStart(4, ' ')}  ${item.file}`)
  }
}

if (critical.length > 0) {
  console.log(`lint:loc: ${critical.length} file(s) above ${MAX_THRESHOLD} lines:`)
  for (const item of critical) {
    console.log(`  HIGH  ${item.lines.toString().padStart(4, ' ')}  ${item.file}`)
  }
}

if (strict && critical.length > 0) {
  process.exit(1)
}
