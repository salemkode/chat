# Salemkode Chat Architecture

## Purpose

This document describes the current implementation of the project as it exists in the repository today. It focuses on the runtime architecture, main data flows, and the responsibilities of each major subsystem.

## What This App Is

Salemkode Chat is a web chat application built around:

- A React client rendered with TanStack Router
- Clerk authentication in the browser
- Convex as the backend, database, mutations/actions layer, and AI orchestration layer
- `@convex-dev/agent` for threaded AI conversations
- A **browser localStorage cache** of the last successfully loaded threads, messages, models, projects, and settings (keyed by Convex `users` id) so the UI can fall back when the device is offline
- `ConvexQueryCacheProvider` from `convex-helpers` for in-session query subscription reuse (see [Query Caching](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md#query-caching))
- A separate memory subsystem that stores durable user, thread, and project memories with embeddings via `@convex-dev/rag`

At a high level, the app is **Convex-first for live data**, with **localStorage + PWA shell** improving resilience when disconnected.

## High-Level System Layout

### 1. Frontend application

The frontend lives under `src/` and is responsible for:

- Routing and app shell composition
- Rendering chat threads, messages, memory screens, and admin screens
- Persisting a minimal offline snapshot to `localStorage` (`src/offline/local-cache.ts`) and theme preferences (`public/theme-init.js`)
- Triggering Convex mutations/actions for chat, sync, admin, and memory operations

Main frontend entrypoints:

- `index.html`: browser document shell and app mount point
- `src/main.tsx`: client bootstrap
- `src/routes/__root.tsx`: top-level providers
- `src/router.tsx`: TanStack Router setup
- `src/routes/_layout.tsx`: authenticated/offline-aware app shell
- `src/routes/_layout.index.tsx`: empty/new chat view
- `src/routes/_layout.$chatId.tsx`: thread view
- `src/routes/memory.tsx`: memory management UI
- `src/routes/admin.tsx`: admin UI for providers/models

### 2. Auth and data access

The app uses:

- Clerk in the browser for sign-in/sign-up
- `ConvexProviderWithClerk` to attach Clerk auth to Convex requests
- `getAuthUserId` on the backend to resolve or create the local `users` record

Important detail: the backend does not treat Clerk as the app's user database. Instead, Clerk identity is mapped into the Convex `users` table on demand.

### 3. AI chat execution

AI generation runs in Convex:

- The client requests message generation through `api.agents.generateMessage`
- The backend resolves the selected model and provider from Convex tables
- Convex schedules `internal.agents.streamMessage`
- `streamMessage` builds the provider client, creates an `Agent`, and streams output into the thread managed by `@convex-dev/agent`

Optional web search is injected as a tool through `exaWebSearchTool` when enabled in the prompt input.

### 4. Offline and PWA

- **Live data** comes from Convex (`useQuery` via `convex-helpers/react/cache` in `src/lib/convex-query-cache.ts`).
- When the network drops, **hooks in `src/hooks/use-chat-data.ts`** prefer live results when present; otherwise they read the last snapshot from `localStorage` (threads, messages per thread, models, projects, session, settings).
- **PWA**: `vite-plugin-pwa` in `vite.config.ts` precaches static assets; `navigateFallback: '/index.html'` lets deep links load the shell offline so the client router can run. The service worker is registered from `src/main.tsx`.
- **Sign-out** clears namespaced `localStorage` keys via `clearLocalOfflineCache()` in `ConvexClientProvider`.
- **Legacy IndexedDB**: `deleteLegacyOfflineIndexedDb()` removes the old Dexie database name on boot (`src/main.tsx`) so upgrades do not leave stale data.

### 5. Memory subsystem

The memory subsystem is separate from the normal chat thread/message storage. It supports:

- User-level memories
- Thread-level memories
- Project-level memories
- Semantic search with embeddings via `@convex-dev/rag`
- Automatic extraction of durable memories from completed threads

The public API is in `convex/functions/memory.ts`, with internal helpers in `convex/functions/memoryInternal.ts`, `memoryShared.ts`, `memoryRag.ts`, and `memoryExtraction.ts`.

## Runtime Flow

### App boot

1. `index.html` loads the app document shell and mounts `src/main.tsx` (which registers the PWA service worker when supported).
2. `src/routes/__root.tsx` wraps the routed app in providers including `ThemeProvider` and `ConvexClientProvider`.
3. The route tree then renders either the chat shell, memory page, admin page, or auth screens.

### Authentication flow

### Browser side

- `ConvexClientProvider` creates a `ConvexReactClient`
- It wraps the app with `ClerkProvider`
- It then wraps Convex with `ConvexProviderWithClerk`

### Backend side

- Convex functions call `getAuthUserId(ctx)`
- `getAuthUserId` reads the Clerk identity
- It finds or creates a `users` row
- It also updates changed profile fields such as name, email, image, and phone

This means most backend functions can work with a stable Convex `userId` even though authentication is delegated to Clerk.

### Chat flow

### UI shell

The main chat shell is `src/routes/_layout.tsx`.

It:

- blocks access when there is no authenticated session and no trusted offline session snapshot in `localStorage`
- loads models via `useModels()` (Convex + cached snapshot)
- keeps the current draft in `localStorage` (per-thread keys in `useDraft`)
- remembers the selected model in `localStorage`
- calls `useSendMessage()` when the prompt is submitted

### Creating and sending a message

`useSendMessage()` in `src/hooks/use-chat-data.ts` handles message submission:

1. If offline, it refuses to send.
2. If there is no existing thread, it creates one with `api.agents.createChatThread`.
3. It calls `api.agents.generateMessage`.
4. It clears the saved draft in `localStorage`.

### Server-side generation

`convex/agents.ts` is the core AI orchestration module.

`generateMessage`:

1. verifies the user
2. loads the selected model from `models`
3. loads the model's provider from `providers`
4. schedules `internal.agents.streamMessage`

`streamMessage`:

1. builds a language model instance based on `providerType`
2. creates an `Agent`
3. optionally attaches the Exa web search tool
4. streams the assistant response into the agent thread
5. schedules post-processing with `memoryExtraction.extractMemoriesFromThread`

The supported provider types are admin-configured and include OpenRouter, OpenAI, Anthropic, Google, Azure, Groq, DeepSeek, xAI, and several OpenAI-compatible providers.

### Thread metadata

The thread itself is managed by `@convex-dev/agent`, but this project stores app-specific metadata in `threadMetadata`, including:

- emoji
- icon
- section assignment
- pin state

Successful thread list fetches also persist this metadata into the `localStorage` thread snapshot for offline sidebar rendering.

### Message rendering

The chat page (`src/routes/_layout.$chatId.tsx`) reads:

- thread data from `useThread(chatId)`
- messages from `useMessages(chatId)`

Both hooks subscribe to Convex when online and fall back to the last `localStorage` snapshot when offline.

`ChatMessageList` virtualizes message rendering with `@tanstack/react-virtual`.

`Message` renders:

- user bubbles
- assistant markdown output
- reasoning blocks when a reasoning part is present

## Offline Architecture

### Browser storage model

- **`localStorage`**, namespaced under `salemkode-chat:v1:` (`src/offline/local-cache.ts`):
  - Session snapshot (trusted Convex user id + profile fields) for offline gatekeeping
  - Per-user keys for threads list, models, projects, per-thread message JSON, and settings mirror
- **Thread drafts** remain in `localStorage` with keys `chat-draft:<threadId>` (`useDraft` in `use-chat-data.ts`)
- **Theme** uses `theme-preference` in `public/theme-init.js`

There is **no IndexedDB** for app chat data; Workbox may still use the Cache API internally for precached static assets.

### PWA service worker

Generated by **`vite-plugin-pwa`** at build time from `vite.config.ts`:

- Precaches built JS/CSS/HTML, icons, fonts, etc.
- Uses **`navigateFallback: '/index.html'`** so navigation requests while offline receive the SPA shell.

### Limitations

- **Sending** messages and most mutations require connectivity; offline mode is **read-oriented** (last known snapshot).
- Snapshots are updated when online data successfully loads; there is no multi-tab sync engine or mutation outbox.

## Memory Architecture

### Memory scopes

The memory system stores three kinds of durable facts:

- `userMemories`: facts/preferences that should follow the user everywhere
- `threadMemories`: context specific to a single conversation
- `projectMemories`: facts shared by a group of threads/projects

Projects are stored in the `projects` table and can reference multiple thread IDs.

### Memory API

`convex/functions/memory.ts` exposes the main public operations:

- create user/thread/project memory
- list memories
- update memory
- delete memory
- create/list projects
- attach a thread to a project
- semantic memory search

The `/memory` route uses those APIs directly.

### Embeddings and semantic search

`convex/functions/memoryRag.ts` configures a `RAG` instance with:

- OpenRouter embeddings
- `openai/text-embedding-3-small`
- filter fields for `userId`, `threadId`, and `projectId`

Each memory record is stored both:

- as a normal Convex document
- as an indexed RAG entry keyed by `memory:<scope>:<id>`

Search works by:

1. querying the RAG namespace for the user
2. applying scope-aware filters
3. resolving matching memory documents by ID
4. returning ranked hits to the UI

### Automatic memory extraction

After each generated response, `streamMessage` schedules `extractMemoriesFromThread`.

That action:

1. loads new successful messages from the agent thread
2. builds a transcript from unprocessed messages only
3. asks a model to extract stable memories
4. writes accepted memories into user/thread/project scope
5. updates `memoryExtractionState` with progress and errors

The extractor is intentionally conservative and skips short or obviously temporary facts.

## Admin Architecture

The admin area is available at `/admin` and is online-only.

It manages two related tables:

- `providers`
- `models`

The admin flow supports:

- provider CRUD
- model CRUD
- enabling/disabling providers and models
- ordering providers/models
- uploading icons through Convex storage

Regular users do not choose raw providers directly. They pick from enabled models, and each model references a provider.

## Core Data Model

The most important Convex tables are:

- `users`: local user records resolved from Clerk identities
- `providers`: admin-configured LLM providers and API credentials
- `models`: admin-configured models connected to providers
- `userFavoriteModels`: per-user favorite model list
- `threadMetadata`: app-specific metadata for agent threads
- `userSettings`: editable display name/avatar/bio
- `userMemories`, `threadMemories`, `projectMemories`: durable memory store
- `projects`: project grouping for threads
- `memoryExtractionState`: per-thread extraction progress

There are also older or separate memory-file tables:

- `memoryFiles`
- `memoryChunks`
- `memoryEmbeddingCache`
- `memoryMeta`
- `memorySyncState`

Those are part of a file/chunk indexing direction and are not the primary chat memory path used by the current `/memory` UI.

## Important Directories

- `src/routes`: pages and route-level composition
- `src/components`: shared UI and chat widgets
- `src/offline`: `local-cache.ts` (browser snapshot persistence) and `schema.ts` (shared record types)
- `convex/agents.ts`: AI execution, thread creation, pin/icon updates, metadata listing
- `convex/chat.ts`: lower-level thread/message queries and deletion
- `convex/admin.ts`: admin API for providers and models
- `convex/users.ts`: viewer/settings user API
- `convex/functions/memory*.ts`: memory CRUD, search, extraction, and RAG internals

## Current Implementation Notes

These are important if you are researching or extending the project:

- Chat rendering uses live Convex subscriptions when online; `localStorage` holds the last snapshot for read-only offline use.
- Sending messages requires connectivity; drafts persist in `localStorage` only.
- Mutations (settings, favorites, pins, etc.) are disabled while offline in `use-chat-data` hooks.
- The prompt input includes attachment UI; uploads require network.
- The message list supports streaming; debounced writes persist stable snapshots to `localStorage` for offline fallback.
- `vectorSearchChunks` in `convex/functions/memorySearch.ts` is currently stubbed and returns no vector results.
- The memory file/chunk tables exist, but the active user-facing memory workflow is the user/thread/project memory system.
- Some auth redirect code in the login/auth redirect components is commented out, so auth transitions are not fully polished.

## Request Lifecycle Summary

For a normal online chat request, the end-to-end path is:

1. User types into `AIPromptInput`
2. `useSendMessage` ensures a thread exists
3. `api.agents.generateMessage` schedules AI generation
4. `internal.agents.streamMessage` streams the assistant response into the Convex agent thread
5. `useMessages` / `useUIMessages` receives live updates from Convex
6. A debounced writer mirrors the latest message list into `localStorage` for offline fallback
7. `ChatMessageList` renders the message list
8. Memory extraction runs asynchronously after the response completes

Summary:

- Convex owns remote execution and persistence
- The React client subscribes live when online
- `localStorage` stores a **read-only** last snapshot for the same browser profile (not a full sync engine)
