# Documentation

Project docs are Markdown files in the repository (`docs/`). This site is generated with [VitePress](https://vitepress.dev/) — only `docs/.vitepress/` adds configuration; your notes stay plain `.md`.

## Quick links

- [Agent notes (AI)](/agent) — when and how to keep docs in sync with code
- [Architecture](/architecture) — monorepo layout and systems
- [Cloudflare Pages](/cloudflare-pages) — web deploy on Cloudflare
- [Research](/research/README) — longer-form system narrative

## Local preview

From the repo root:

```bash
pnpm run docs:dev
```

Build static HTML (output in `docs/.vitepress/dist`):

```bash
pnpm run docs:build
```
