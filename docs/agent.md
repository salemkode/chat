# Agent instructions — documentation

When you change behavior, architecture, deployment, or user-visible flows in this repo, **update the documentation in `docs/`** so it stays accurate. Prefer small, targeted edits over large rewrites.

## When to update docs

- **Architecture or boundaries** shift (new apps, packages, major data flow): edit [`architecture.md`](./architecture.md).
- **Deploy / hosting / env vars** change: edit [`cloudflare-pages.md`](./cloudflare-pages.md) and any related deploy notes.
- **System design stance** (memory, context, routing, local-first, UX principles) changes in code: align the matching chapter under [`research/`](./research/README.md) or the research `README` reading order if structure changes.
- **New Markdown page** you add under `docs/` that should appear in the doc site: add it to the nav/sidebar in [`docs/.vitepress/config.mts`](./.vitepress/config.mts).

## How to write

- Match the tone and level of detail of the nearest existing section.
- Fix broken internal links when you rename or move files.
- Do not duplicate long explanations across files unless one file clearly defers to another with a single link.

## Doc site

These files are also served by VitePress (`pnpm run docs:dev`). After editing Markdown, a quick local preview catches formatting issues.
