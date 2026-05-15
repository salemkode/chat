# Ship (grouped commits + changelog + push)

Run from the repo root:

```bash
bun run ship
```

Preview what would be committed (no git writes):

```bash
bun run ship -- --dry-run
```

Commit and update `CHANGELOG.md` locally but do not push:

```bash
bun run ship -- --no-push
```

Interactive commit messages (one prompt per group):

```bash
SHIP_INTERACTIVE=1 bun run ship
```

The script creates **one commit per area** (convex, packages, web, mobile, …), then appends a dated section to `CHANGELOG.md`, commits that, and **pushes once**. Use the same command in Cursor, Codex CLI, OpenCode, or any terminal.
