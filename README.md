# Salemkode Chat

Salemkode Chat is a pnpm + Turbo monorepo for a Convex-powered AI chat product with:

- Clerk authentication
- Expo mobile app
- React Router framework web app
- admin-managed model/provider configuration
- platform-specific offline read-back layers
- a memory system for durable user, thread, and project context

## Main Docs

- [Architecture overview](./docs/architecture.md)
- [Research docs](./docs/research/README.md)
- [Development setup](./DEVELOPMENT.md)
- [Cloudflare Pages deploy](./docs/cloudflare-pages.md)

## Tech Stack

- React 19
- React Router
- Convex
- `@convex-dev/agent`
- Clerk
- Tailwind CSS 4
- Vite + `vite-plugin-pwa` (Workbox precache, offline shell)

## Project Structure

- `apps/mobile`: Expo Router mobile client
- `apps/web`: React Router framework web client
- `packages/shared`: shared hooks and domain logic
- `convex/`: backend schema, mutations, actions, and AI orchestration
- `docs/`: project documentation

## Running Locally

This repo uses pnpm as the package manager.

```bash
pnpm install
pnpm run dev
```

Mobile:

```bash
pnpm run mobile:dev
pnpm run ios
pnpm run android
```

Useful commands:

```bash
pnpm run build
pnpm run test
pnpm run lint
pnpm run dev:scan
```

`pnpm run dev:scan` enables `react-scan` locally so you can inspect unnecessary renders and hot paths without changing app code.

## Environment Notes

The app expects frontend and Convex auth configuration, including:

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_AUTH_FRONTEND_URL` (optional; when set, production `/login` redirects to this auth frontend origin, for example `https://accountist.salincode.com`)

Some backend features also require provider API keys, for example:

- `OPENROUTER_API_KEY`
- `EXA_API_KEY` for in-chat web search

See [DEVELOPMENT.md](./DEVELOPMENT.md) and the Convex environment configuration for the rest of the setup.
