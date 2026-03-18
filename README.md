# Salemkode Chat

Salemkode Chat is a Convex-powered AI chat application with:

- Clerk authentication
- admin-managed model/provider configuration
- a Dexie-based offline cache and sync layer
- a memory system for durable user, thread, and project context

## Main Docs

- [Architecture overview](./docs/architecture.md)
- [Development setup](./DEVELOPMENT.md)

## Tech Stack

- React 19
- TanStack Router
- Convex
- `@convex-dev/agent`
- Clerk
- Dexie
- Tailwind CSS 4
- Vite + PWA service worker

## Project Structure

- `src/`: frontend routes, components, and offline client logic
- `convex/`: backend schema, mutations, actions, and AI orchestration
- `docs/`: project documentation
- `public/`: static assets and manifest files

## Running Locally

This repo uses Bun as the package manager.

```bash
bun install
bun run dev
```

Useful commands:

```bash
bun run build
bun run test
bun run lint
bun run dev:scan
```

`bun run dev:scan` enables `react-scan` locally so you can inspect unnecessary renders and hot paths without changing app code.

## Environment Notes

The app expects frontend and Convex auth configuration, including:

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_AUTH_FRONTEND_URL` (production auth frontend origin, for example `https://accountist.salincode.com`)

Some backend features also require provider API keys, for example:

- `OPENROUTER_API_KEY`
- `EXA_API_KEY` for in-chat web search

See [DEVELOPMENT.md](./DEVELOPMENT.md) and the Convex environment configuration for the rest of the setup.
