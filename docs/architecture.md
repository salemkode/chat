# Salemkode Chat Architecture

## Purpose

This document describes the current implementation of the project as it exists in the repository today. It focuses on the runtime architecture, main data flows, and the responsibilities of each major subsystem.

## What This App Is

Salemkode Chat is a web chat application built around:

- A React client rendered with TanStack Router
- Clerk authentication in the browser
- Convex as the backend, database, mutations/actions layer, and AI orchestration layer
- `@convex-dev/agent` for threaded AI conversations
- A Dexie-backed offline cache in the browser
- A separate memory subsystem that stores durable user, thread, and project memories with embeddings via `@convex-dev/rag`

At a high level, the app is **UI + offline cache first**, with Convex acting as the source of remote truth and orchestration layer.

## High-Level System Layout

### 1. Frontend application

The frontend lives under `src/` and is responsible for:

- Routing and app shell composition
- Rendering chat threads, messages, memory screens, and admin screens
- Managing local offline state in IndexedDB through Dexie
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

### 4. Offline subsystem

The offline subsystem is built from:

- Dexie (`src/offline/db.ts`) for IndexedDB storage
- A service worker (`src/offline/sw.ts`) registered by `OfflineProvider`
- Sync mutations in `convex/offline.ts`
- A repository layer in `src/offline/repositories.ts`

The UI reads almost everything from Dexie, not directly from live Convex chat queries.

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

1. `index.html` loads the app document shell and mounts `src/main.tsx`.
2. `src/routes/__root.tsx` wraps the routed app in:
   - `ThemeProvider`
   - `ConvexClientProvider`
   - `OfflineProvider`
3. `OfflineProvider`:
   - tracks browser online/offline state
   - registers the PWA service worker
   - starts sync when the user is authenticated and online
   - exposes sync status through context
4. The route tree then renders either the chat shell, memory page, admin page, or auth screens.

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

- blocks access when there is no authenticated session and no trusted offline cache
- loads models from the offline repository
- keeps the current draft in Dexie
- remembers the selected model in `localStorage`
- calls `useSendMessage()` when the prompt is submitted

### Creating and sending a message

`useSendMessage()` in `src/offline/repositories.ts` handles message submission:

1. If offline, it refuses to send.
2. If there is no existing thread, it creates one with `api.agents.createChatThread`.
3. It calls `api.agents.generateMessage`.
4. It clears the saved draft.
5. It triggers sync and thread hydration.

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

This metadata is also mirrored into the offline thread cache.

### Message rendering

The chat page (`src/routes/_layout.$chatId.tsx`) reads:

- thread data from `useThread(chatId)`
- messages from `useMessages(chatId)`

Both hooks read from Dexie and request hydration when online.

`ChatMessageList` virtualizes message rendering with `@tanstack/react-virtual`.

`Message` renders:

- user bubbles
- assistant markdown output
- reasoning blocks when a reasoning part is present

## Offline Architecture

### Why the app feels offline-first

Most user-facing chat data comes from Dexie tables:

- `session`
- `threads`
- `messages`
- `models`
- `settings`
- `drafts`
- `outbox`
- `syncMeta`

The chat UI does not rely on live Convex queries for normal thread/message rendering.

### Browser storage model

The IndexedDB schema is defined in `src/offline/db.ts`.

Important records:

- `session`: trusted offline session snapshot
- `threads`: local thread index
- `messages`: cached messages for hydrated threads
- `models`: enabled models and favorite flags
- `settings`: local copy of editable user settings
- `drafts`: per-thread prompt drafts
- `outbox`: queued offline mutations
- `syncMeta`: version checkpoints for delta sync

### Bootstrapping offline data

`OfflineProvider` calls `bootstrapOfflineData(convex)` on first trusted sync.

This calls `api.offline.bootstrapOfflineSession`, which returns:

- current user snapshot
- user settings
- enabled models plus favorites
- synced thread index
- offline schema version
- sync state metadata

After the full bootstrap, the client hydrates the latest few threads' messages.

### Delta sync

After bootstrap, sync uses version checkpoints:

- `pullThreadIndex` syncs changed thread metadata since the last thread checkpoint
- `hydrateThreadMessages` syncs changed messages for a specific thread since that thread's message checkpoint

On the server, `convex/offline.ts` populates and maintains the mirror tables:

- `chatThreads`
- `chatMessages`
- `offlineSyncState`

Helper logic lives in `convex/offlineHelpers.ts`.

### Offline outbox

The client can queue a limited set of mutations while offline:

- settings updates
- favorite model changes
- thread pin changes
- thread icon changes
- thread deletion

Queued operations are written into `outbox`, compacted by `dedupeKey`, and flushed through `api.offline.pushOfflineMutations` once connectivity returns.

### Service worker

The PWA service worker in `src/offline/sw.ts` caches:

- app assets
- fonts
- images
- storage assets
- navigation requests

It improves reload behavior and allows the app shell plus cached data to remain usable offline.

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
- `chatThreads`: offline mirror of thread index
- `chatMessages`: offline mirror of message history
- `offlineSyncState`: sync checkpoints and schema version
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
- `src/offline`: Dexie schema, sync, service worker, and repository hooks
- `convex/agents.ts`: AI execution, thread creation, pin/icon updates, metadata listing
- `convex/chat.ts`: lower-level thread/message queries and deletion
- `convex/offline.ts`: full sync, delta sync, and offline outbox replay
- `convex/admin.ts`: admin API for providers and models
- `convex/users.ts`: viewer/settings user API
- `convex/functions/memory*.ts`: memory CRUD, search, extraction, and RAG internals

## Current Implementation Notes

These are important if you are researching or extending the project:

- Chat rendering is based on the offline mirror, not direct live message subscriptions.
- Sending messages currently requires connectivity. Offline compose is supported only through saved drafts, not queued chat sends.
- The offline outbox currently covers settings, favorites, thread metadata changes, and thread deletion, but not new chat messages.
- The prompt input includes attachment UI, but there is no backend attachment pipeline wired to chat generation yet.
- The message components contain streaming-aware UI, but the current offline hydration path mainly persists completed snapshots.
- `vectorSearchChunks` in `convex/functions/memorySearch.ts` is currently stubbed and returns no vector results.
- The memory file/chunk tables exist, but the active user-facing memory workflow is the user/thread/project memory system.
- Some auth redirect code in the login/auth redirect components is commented out, so auth transitions are not fully polished.

## Request Lifecycle Summary

For a normal online chat request, the end-to-end path is:

1. User types into `AIPromptInput`
2. `useSendMessage` ensures a thread exists
3. `api.agents.generateMessage` schedules AI generation
4. `internal.agents.streamMessage` streams the assistant response into the Convex agent thread
5. Offline sync pulls thread/message updates into `chatThreads` and `chatMessages`
6. The browser sync layer writes those records into Dexie
7. `useMessages` reads the Dexie records
8. `ChatMessageList` renders the hydrated message list
9. Memory extraction runs asynchronously after the response completes

That split is the main architectural pattern in this project:

- Convex owns remote execution and persistence
- offline mirror tables make remote state sync-friendly
- Dexie is the browser-facing cache and read model
- React renders from Dexie instead of directly from the server
