# Cloudflare Pages Deployment (Web + API Wiring)

This repo uses:

- `apps/web` deployed to **Cloudflare Pages**
- backend/API hosted on **Convex** (not on Pages)

If you need all traffic under one domain, use your Cloudflare custom domain for Pages and point frontend API variables to Convex.

## 1. Create the Pages project

Create a Cloudflare Pages project (for example `chat-web`) connected to this repo.

Recommended build settings for this monorepo:

- Build command: `pnpm --filter web run build`
- Build output directory: `apps/web/dist/client`
- Root directory: repository root

Node and package manager:

- Node: `20.19.0`
- pnpm: `10.6.5`

## 2. Configure environment variables in Cloudflare Pages

Set these in Pages project settings:

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_AUTH_FRONTEND_URL` (optional)

Do **not** put provider secrets (`OPENROUTER_API_KEY`, `EXA_API_KEY`, etc.) in Pages if they are used by Convex backend functions; keep them in Convex environment config.

## 3. SPA routing and stale assets

This app relies on Cloudflare Pages' built-in SPA behavior:

> If the project does not include a top-level `404.html`, Pages serves the root app shell for
> unmatched routes.

Do not add a top-level `404.html` or a catch-all `_redirects` rewrite for the web app. A catch-all
rewrite can turn missing hashed JavaScript chunks into `200 text/html` responses, which browsers
reject for module scripts.

`apps/web/public/assets/404.html` is intentionally present so stale requests for removed
`/assets/*.js` chunks return a real asset-directory 404 instead of the SPA shell. Deep links like
`/chat/123` should still resolve through the root app shell.

## 4. CLI deploy

From repository root:

```bash
pnpm --filter web run build
pnpm --filter web run deploy:cloudflare
```

Required local env vars:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CF_PAGES_PROJECT_NAME`

## 5. GitHub Actions deploy

Workflow file: `.github/workflows/deploy-cloudflare-pages.yml`

Required GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CF_PAGES_PROJECT_NAME`
- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_AUTH_FRONTEND_URL` (optional)

## API note

Cloudflare Pages hosts your web app. Your chat/model API remains in Convex (`convex/*`).

That is the expected architecture for this repo and avoids re-implementing Convex server logic inside Pages Functions.

## PWA updates

The web app registers a Workbox service worker for offline shell caching. After each deploy, browsers may briefly keep an old cached bundle until the new service worker activates.

The client handles this automatically:

- reloads once when a new service worker is ready
- reloads once when a stale JS chunk fails to load
- shows a visible loading/fallback message instead of a blank black screen if hydration stalls

If a user still sees a stuck screen after one automatic reload, a hard refresh or clearing site data for the production origin resets the service worker and Clerk session cookies.

## React Router Workers guide note

Cloudflare's React Router Workers framework guide is for full-stack React Router deployments with SSR (`ssr: true`) and Worker server entry.

This repo currently runs React Router in SPA mode (`ssr: false`), so deployment should stay on **Pages static upload** (`wrangler pages deploy ...`) instead of `wrangler deploy`.
