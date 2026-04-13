# Smart Git Commit

Analyze git changes and create conventional commits automatically.

**IMPORTANT**: Execute commits with the Shell tool. Do not commit if any quality gate fails.

## Workflow

### 1. Check status

```bash
git status --porcelain
```

If empty: reply **"Nothing to commit. Working tree clean."** and stop.

### 2. Analyze changes

```bash
git diff && git diff --staged && git log -5 --oneline
```

### 3. Group by intent

- **Single commit**: Related changes (feature + tests, formatting + logic in one area).
- **Multiple commits**: Unrelated features, pure formatting-only sweeps, config-only changes, or clearly separate concerns.

### 4. Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <description>`

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`, `chore`

### 5. Safety check

Before committing, warn or fix when you see:

- Possible secrets (API keys, tokens, `.env` contents).
- Debug noise (`console.log` / `debugger` left in production paths — use judgment).
- Very large diffs (e.g. **>500 lines**): call it out; consider splitting commits.

Fix TypeScript and lint issues in the working tree; do not commit broken code.

### 6. Code quality (CRITICAL)

Run from the **repository root** with **pnpm** (this monorepo does not use `npm run` at root).

**Auto-fix + format** (oxlint + oxfmt):

```bash
pnpm run fix
```

**TypeScript / type-aware checks** (all must pass):

```bash
pnpm run typecheck:all
```

**Biome** (only if the repo has Biome configured, e.g. `biome.json` at root):

```bash
pnpm exec biome check --write .
```

**STOP immediately** if any command exits non-zero or prints errors you cannot auto-fix. Report the output to the user, attempt fixes, and re-run the same commands until clean. **Do not create commits** until this step passes with no errors.

### 7. Execute commits

1. State a short **plan** (which files per commit, messages).
2. Run each commit via Shell, one group at a time:

```bash
git add -- <files> && git commit -m "<message>"
```

Use multiple `git add` + `git commit` runs when the plan calls for multiple commits.

### 8. Verify

```bash
git status
```

Confirm working tree is clean (or only intentional leftovers) and summarize what was committed.

## Examples

**Single commit:** `feat(cart): add quantity validation` — e.g. `Cart.tsx` + `Cart.test.tsx` together.

**Multiple commits:**

1. `feat(api): add user search`
2. `docs: update readme`
