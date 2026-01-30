# Smart Git Commit

Analyze git changes and create conventional commits automatically.

**IMPORTANT**: Execute commits with Shell tool. No errors allowed.

## Workflow

### 1. Check Status

```bash
git status --porcelain
```

If empty: "Nothing to commit. Working tree clean." → Stop

### 2. Analyze Changes

```bash
git diff && git diff --staged && git log -5 --oneline
```

### 3. Group by Intent

- **Single commit**: Related changes (feature + tests, formatting + logic)
- **Multiple commits**: Unrelated features, pure formatting, config changes

### 4. Commit Messages

Use conventional commits: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`, `chore`

### 5. Safety Check

Warn about: secrets, debug statements, large diffs (>500 lines)
Fix all type errors manually

### 6. Code Quality (CRITICAL)

```bash
npm run fix && npm run typecheck
```

**🛑 If ANY errors or warnings**: STOP immediately. Report errors to user. Do not commit. and try to fix it.

### 7. Execute Commits

Show plan, then execute with Shell tool:

```bash
git add <files> && git commit -m "<message>"
```

### 8. Verify

```bash
git status
```

## Examples

**Single**: `feat(cart): add quantity validation` for Cart.tsx + Cart.test.tsx

**Multiple**: Separate commits for unrelated changes

1. `feat(api): add user search`
2. `docs: update readme`
