# Chat Monorepo Architecture

## Purpose

This document describes the current repository architecture for the `chat` monorepo. It covers the main runtime systems, ownership boundaries, shared data flow, and the conventions already visible in code.

## System Summary

This repository is a pnpm workspace orchestrated by Turbo. The product is split into:

- `apps/mobile`: Expo + React Native mobile client
- `apps/web`: React Router framework web client
- `packages/shared`: cross-platform hooks and domain helpers
- `convex`: backend schema, queries, mutations, actions, and AI orchestration

There are also non-primary directories that should be treated as supporting or legacy until explicitly adopted:

- `apps/JSWithNativeSignInQuickstart`: Clerk sample app, not part of the main product architecture
- `ls/`: separate Expo app outside the workspace package groups
- build artifacts such as `.output/`, `dist/`, `apps/mobile/dist/`

## Topology

```text
clients
  mobile (Expo Router) ─┐
  web (React Router) ─┼─> Convex backend + database + AI orchestration
  shared package ───────┘

Convex
  schema.ts
  chat / agents / messages / projects / model selection / admin / memory

local persistence
  mobile: SQLite + local cache + optimistic send store
  web: localStorage + offline cache + Convex query cache
```

## Workspace Layout

### Root

- `package.json`: workspace commands
- `pnpm-workspace.yaml`: workspace package globs
- `turbo.json`: task graph for build, dev, typecheck, lint, and test
- `tsconfig*.json`: shared TypeScript base config

### Applications

- `apps/mobile`: primary native app
- `apps/web`: primary web app
- `apps/JSWithNativeSignInQuickstart`: reference or leftover sample app, not a production boundary

### Shared Package

- `packages/shared/src/hooks`: reusable environment-agnostic hooks
- `packages/shared/src/logic`: shared domain helpers like project mention parsing and thread grouping

### Backend

- `convex/schema.ts`: source of truth for persisted data model
- `convex/*.ts`: product domains exposed to clients
- `convex/functions/*`: deeper memory and admin internals
- `convex/lib/*`: backend helpers for auth, providers, billing, rate limits, tools, validators

## Runtime Architecture

### 1. Mobile App

The mobile app uses Expo Router for navigation and keeps route files thin.

Entry and shell:

- `apps/mobile/src/app/_layout.tsx`: global bootstrap for Clerk, Convex, keyboard handling, and the top-level auth/app route split
- `apps/mobile/src/app/(auth)/sign-in.tsx`: dedicated signed-out entry screen with Google-only Clerk login
- `apps/mobile/src/app/(app)/_layout.tsx`: authenticated native shell with the drawer layout, model provider, and protected chat stack
- `apps/mobile/src/app/(app)/_layout.web.tsx`: authenticated web shell with the sidebar and inset content panel

Chat architecture follows the repo rule set:

- route files compose chat using reusable components instead of owning the whole screen
- model dialog modules live in `apps/mobile/src/components/dialog`
- message presentation is shared through `apps/mobile/src/components/chat/message-row.tsx`

Current chat composition:

- `apps/mobile/app/(app)/(pager)/chat.tsx`: chat route that composes `ChatDrawerLayout`, `MobileSidebarPage`, and `ChatPage`
- `apps/mobile/src/components/chat/chat-drawer-layout.tsx`: gesture-driven template-inspired drawer with live sidebar content behind the chat surface
- `apps/mobile/app/(app)/(pager)/sidebar.tsx`: compatibility route that can render the same reusable sidebar page directly
- legacy routes such as `apps/mobile/app/(app)/(chatTab)/chat/[id].tsx` now map deep links into the shared current-chat store and redirect into the chat shell route
- top-level legacy routes under `apps/mobile/app/(tabs)` and `apps/mobile/app/sidebar` are redirect-only shims into the authenticated chat/projects/profile routes
- the authenticated chat shell now uses a gesture drawer instead of swipe tabs: the sidebar slides from the left, while the main chat remains the default landing surface
- `ChatPage` composes `ChatHeader`, `MessageList` or `NewChatEmptyState`, floating `ChatComposer`, `OfflineBanner`, and `ModelPickerDialog`
- mobile chat input uses a Liquid Glass-aware floating `ChatComposer` dock with `react-native-keyboard-controller` positioning, multiline draft input, attachments, search, model access, and send/stop controls while `ModelPickerDialog` stays in `components/dialog` with a grouped, searchable list (Auto, Favorites, all models) on top of the same prop-driven boundaries as before
- `MobileSidebarPage` composes the real mobile sidebar from reusable project, thread-list, and footer sections; the mobile list follows a ChatGPT-style structure with top shortcuts, pinned chats, compact expandable projects, relative-date chat sections, and long-press / overflow row actions
- `use-chat-conversation.ts` assembles UI state, draft state, model state, project selection, send/replay logic, and inline error feedback

Mobile data and offline layer:

- `apps/mobile/src/mobile-data/*`: Convex-facing hooks for threads, messages, models, drafts, projects, and sending
- `apps/mobile/src/offline/*`: SQLite-backed cache and offline record types
- `apps/mobile/src/store/current-chat.ts`: shared current chat selection state for drawer-driven chat navigation
- Convex optimistic mutation updates own thread/message handoff after send; failed sends are surfaced inline through rendered message failure state
- `apps/mobile/src/components/chat/message-list.tsx` and `message-row.tsx`: native mobile message rendering that mirrors web row semantics for activity traces, failure presentation, stalled-generation recovery, and message actions while keeping touch-first presentation
- `apps/mobile/src/components/chat/mobile-sidebar-*.tsx`: reusable native sidebar sections that consume the live thread and project model

Important mobile rule already implemented:

- optimistic updates are attached to Convex mutations with `.withOptimisticUpdate(...)`
- optimistic behavior is not added to actions
- optimistic mutation failures surface as inline non-blocking failed assistant responses with replay actions

### 2. Web App

The web app uses React Router framework mode (SPA configuration) with Convex for live data.

Entry and shell:

- `apps/web/src/main.tsx`: client bootstrap
- `apps/web/src/router.tsx`: router creation and root Convex provider wiring
- `apps/web/src/routes/__root.tsx`: HTML shell, Clerk provider, theme provider, Convex client provider
- `apps/web/src/components/convex-client-provider.tsx`: auth-aware Convex client setup plus query cache provider

Web feature areas:

- `apps/web/src/routes/*`: route handlers for chat, auth, admin, share, signup, memory demo
- `apps/web/src/components/*`: chat UI, sidebar, prompt input, auth redirect, settings, markdown, model UI
- settings shell lives in `apps/web/src/components/settings-modal.tsx`; settings dropdown fields use the shared Shadcn `Select` pattern for consistent design, and appearance preferences now include theme mode, accent color, plus separately persisted English and Arabic font stacks restored from local storage before hydration
- user-facing web copy now flows through a lightweight typed i18n layer in `apps/web/src/lib/i18n.ts` and `apps/web/src/components/i18n-provider.tsx`, which owns locale preference, `html[lang|dir]`, and translation dictionaries so adding a new language is mostly a dictionary change
- `apps/web/src/components/chat-model-context.tsx`: model preference state; persists `default model` and `last used model` separately in `localStorage`
- `apps/web/src/hooks/chat-data/*`: thread/message send flow, optimistic message list updates, local draft support
- `apps/web/src/offline/*`: localStorage-backed offline snapshots

The web app is currently the richer admin surface:

- provider and model management
- memory and share routes
- broader desktop-oriented UI primitives under `apps/web/src/components/ui`

Streaming markdown rendering on web:

- chat markdown is rendered with `streamdown` in `apps/web/src/components/chat-markdown.tsx`
- code and mermaid support are enabled through `@streamdown/code` and `@streamdown/mermaid`
- assistant replies and live reasoning use the same hybrid streaming path: committed markdown blocks render append-only through `Streamdown`, while the current unfinished block stays in a lightweight plain-text tail until it closes
- web block commits are token-aware: paragraphs commit when a blank line or a new block starts after them, fenced code commits when the closing fence arrives, and active lists / tables / blockquotes stay in the tail until they are clearly closed
- `ChatMessageList` keeps `dataVersion` structural so per-token stream text does not force full-list remeasurement

### 3. Shared Package

`packages/shared` is intentionally small and contains code that should remain free of platform UI assumptions.

Current responsibilities:

- reusable hooks such as `use-online-status` and `use-smooth-text`
- thread grouping logic
- project mention parsing used by mobile chat composer
- shared admin types
- **chat parity (pure logic)**: pending-send handoff (`logic/pending-send-core`), message list merge (`logic/merge-message-lists`), message ordering (`logic/message-order`), optimistic **user** `listMessages` row shape (`logic/optimistic-list-messages-core`; assistant replies are not optimistic), generation stall and send-queue primitives (`logic/chat-generation-core`), optimistic thread id/title (`logic/optimistic-thread-core`), send pipeline helpers (`logic/send-pipeline-core`).

`@chat/chat-core` owns cross-platform snapshot resolution (`resolveChatSnapshot`), in-flight send registry (`SendRegistryProvider`), `useThreadMessages` (live + offline + in-flight merge), `useGenerationState` (active assistant, stall detection, and stop eligibility), and adapter contracts for storage, attachments, and events. Stop is enabled while tokens or tool/reasoning activity are visible; after `STALL_THRESHOLD_MS` (20s) with no progress, clients expose force-stop via `canForceStop`. Web and mobile mount `ChatCoreShell` (registry + sidebar provider) with platform adapters under `apps/*/src/lib/chat-core-adapters.ts`. Chat data hooks use `convex/react` directly; offline snapshots plus the send registry replace the old convex-helpers-style query warm-cache for chat paths. Web `PendingSendsProvider` is a thin wrapper over `SendRegistryProvider` that keeps local blob previews during upload. Mobile listens for `CHAT_STREAM_RESUME_EVENT` via `DeviceEventEmitter` (`apps/mobile/src/lib/chat-events.ts`) with the same event names as the web `window` dispatcher so stream-resume behavior aligns.

This package should continue to hold pure logic and cross-platform primitives, not app-specific screen composition.

### 4. Convex Backend

Convex is the central system of record. It owns:

- authentication mapping from Clerk identities to app users
- database schema
- chat thread and message operations
- AI model/provider configuration
- memory extraction and retrieval
- billing and admin helpers

Chat storage is first-party Convex data. New chat threads live in `chatThreads`, persisted rows in `chatMessages`, active stream state in `chatStreamingMessages` and `chatStreamDeltas`, upload metadata in `chatFiles`, and optional semantic-search vectors in `chatMessageEmbeddings`. The old `@convex-dev/agent` component is deliberately outside the new data boundary: legacy component thread IDs are not migrated or dual-read, and paths that encounter non-`chatThreads` IDs skip them as stale history. For uploads, per-turn model choice, and how much history is sent to the model, see [Chat attachments, multi-model threads, and context](./chat-attachments-models-and-context.md).

Primary modules:

- `convex/schema.ts`: tables for users, providers, models, routing policy, projects, shares, and related records
- `convex/agents.ts`: chat thread creation, generation, regeneration, upload URL creation, streaming lifecycle
- `convex/chat.ts`: chat queries such as message and active-stream listing
- `convex/chatEngine.ts` and `convex/lib/chatEngine.ts`: first-party chat message, stream, UI-message, and embedding helpers
- `convex/messages.ts`: message-oriented operations
- `convex/projects.ts`: project data and project-thread relationships
- `convex/modelSelection.ts`: model selection and routing
- `convex/admin.ts`: admin operations
- `convex/shares.ts`: shared-chat capabilities
- `convex/functions/memory*.ts`: durable memory, extraction, search, and sync pipeline

### 5. Authentication

Both clients authenticate with Clerk and then pass auth into Convex.

Mobile:

- `@clerk/expo`
- `ConvexProviderWithClerk`

Web:

- `@clerk/react-router`
- custom auth token wiring inside `convex-client-provider.tsx`

Backend:

- Convex resolves the authenticated identity into the local `users` table
- product data is keyed to Convex user IDs, not directly to Clerk records

## Chat Flow

### Mobile

1. User lands on the `chat` shell route and opens the gesture drawer when they need history/projects.
2. Route composes `ChatDrawerLayout`, live `MobileSidebarPage`, and `ChatPage`.
3. The route and the attachments sheet share `ChatAttachmentsProvider`, so selected files survive sheet dismissal and remain visible in the composer until send or removal.
4. `ChatComposer` submits through `useSendMessage`.
5. `useSendMessage` optionally creates a thread, uploads attachment URIs through `agents.generateAttachmentUploadUrl`, and calls Convex generation mutations.
6. File picker options are derived from each selected model attachment policy (`supportedAttachmentMediaTypes` when configured; an explicit empty list disables uploads; otherwise capability inference). Unsupported files are rejected in the sheet before upload, and the composer shows non-blocking inline errors for picker or upload failures.
7. Successful user messages render stored file parts from `chatMessages.parts`, so attachments remain visible in the transcript after send.
8. If a mutation fails, the composer restores the draft text, keeps the selected attachments, and shows inline error text.
9. Raw Convex/provider errors are normalized for users through `packages/shared/src/logic/user-facing-error-catalog.ts` (`formatUserFacingError`, `formatMessageFailureNote`) before they reach `ChatInlineError` on web and mobile.

### Web

1. Route loads chat shell and current thread through React Router.
2. Data hooks subscribe to Convex queries.
3. `useSendMessage` in `apps/web/src/hooks/chat-data/send.ts` creates a thread if needed, uploads files, and calls generation mutations.
4. In the web composer, long pasted plain text is converted into a real `.txt` `File` attachment before send rather than being inlined into the prompt body.
5. Optimistic assistant and user message placeholders are inserted with local query store updates.
6. Server-side mutation validation re-checks attachment media types against the selected model policy before the prompt is persisted.
7. Successful data is mirrored into offline browser storage for read-back.

## Offline Model

### Mobile

Mobile has a stronger local-first layer than web.

- message and thread snapshots are cached in `apps/mobile/src/offline/cache.ts`
- storage is backed by SQLite under `apps/mobile/src/offline/db.ts`
- drafts are persisted separately
- local thread IDs support optimistic sends before a server thread exists
- mobile send handoff mirrors web: local thread IDs exist only before server resolution, while Convex optimistic rows own the post-handoff state so route changes into a resolved thread do not duplicate messages or reset the visible chat shell

This gives the mobile client:

- offline readback of cached threads/messages
- temporary local conversation continuity before server thread resolution
- inline failed response recovery via replay actions
- web-aligned assistant/user message semantics, including activity timeline rendering, failure-mode-aware UI, and stop/resend/repeat actions on persisted rows; the latest active assistant response is also flagged as stalled after the shared no-progress threshold so the row can expose Stop/Resend directly inside the message

Mobile streaming markdown:

- assistant responses render through the native message text component while streaming
- Expo source config keeps New Architecture enabled in `apps/mobile/app.json`, matching the generated native mobile projects used by Reanimated 4
- Reanimated worklets remain enabled through `react-native-worklets` in `apps/mobile/babel.config.js`
- streaming markdown repair runs on the RN JS thread before native text rendering; it does not call `remend` from a worklet/runtime thread

### Web

Web offline support is lighter and browser-oriented.

- local snapshots live in `apps/web/src/offline/local-cache.ts`
- drafts are kept in local storage helpers
- `ConvexQueryCacheProvider` remains on web for admin/share routes; chat paths use `@chat/chat-core` snapshot merge instead
- offline mode is mainly for last-known-state readback, not queued mutations

## AI and Model Routing

The system is provider-driven rather than hardcoding a single LLM backend.

Configuration lives in Convex tables:

- `providers`
- `models`
- `modelSelectionProfiles`
- `modelRoutingPolicies`
- related collections and admin metadata

Generation path:

1. client selects or resolves a model
2. Convex loads the model and provider configuration
3. backend saves the user prompt and a pending assistant row in `chatMessages`
4. backend creates the language model client for the provider and calls AI SDK `streamText`
5. UI-message chunks are stored in `chatStreamDeltas`, then the assistant row is finalized atomically when the stream completes
6. a backend watchdog checks stream heartbeats and marks stalled generations failed after the no-progress window, which lets clients expose Stop/Resend recovery instead of leaving an infinite pending state
7. post-processing may store search embeddings, trigger memory extraction, or run related bookkeeping

This design lets admin configuration change model availability without redeploying clients.

Model records now also carry attachment policy metadata (`supportedAttachmentMediaTypes`, validation status/message/timestamp). When `supportedAttachmentMediaTypes` is set explicitly (even to an empty list), it becomes the source of truth for whether uploads are enabled for that model. Admin settings can run a bulk validation pass to refresh per-model status for the admin models table. Attachment policy is runtime-aware as well, so provider adapters that are text-only today, such as the native DeepSeek adapter in this backend, override optimistic capability inference and disable file inputs until backend support exists.

## Memory Subsystem

The memory subsystem is a separate domain layered on top of the main chat product.

It supports:

- user memories
- thread memories
- project memories
- semantic search and extraction

Main files:

- `convex/functions/memory.ts`
- `convex/functions/memoryInternal.ts`
- `convex/functions/memorySearch.ts`
- `convex/functions/memoryExtraction.ts`
- `convex/functions/memoryRag.ts`

Operationally:

- generated conversations can be mined for durable facts
- those facts are stored and later retrieved for context enrichment
- memory concerns are kept outside the core chat UI composition layer

## Design Rules Already Present

These are the main architectural rules reflected in the current mobile code and should remain the default for future work:

- keep mobile chat UI in reusable components under `apps/mobile/src/components/chat`
- keep model dialogs under `apps/mobile/src/components/dialog`
- keep route files thin and compositional
- keep the authenticated chat shell drawer-first; account/profile belongs in sidebar-driven or pushed routes instead of primary tabs
- share message row layout across chat modes
- use Convex optimistic updates only on mutations
- show inline, non-blocking failure feedback when optimistic mobile sends fail
- keep shared package code platform-agnostic
- keep Convex as the source of truth for persisted product state

## Current Gaps and Cleanup Opportunities

The repository is functional, but the architecture is carrying some extra weight:

- `README.md` still describes the repo as a single web app and should stay aligned with the monorepo structure
- `apps/JSWithNativeSignInQuickstart` appears to be a sample app and should either be documented as reference-only or removed
- `ls/` is a separate Expo project outside the workspace package globs and should be either promoted intentionally or moved out
- checked-in build artifacts (`dist`, `.output`, `apps/mobile/dist`) blur the source architecture and should be treated as generated output

## Recommended Ownership Boundaries

Use these boundaries for ongoing work:

- mobile UI composition: `apps/mobile/src/components/**`
- mobile route orchestration: `apps/mobile/app/**`
- mobile data hooks and offline behavior: `apps/mobile/src/mobile-data/**`, `apps/mobile/src/offline/**`, `apps/mobile/src/store/**`
- web route and UI logic: `apps/web/src/routes/**`, `apps/web/src/components/**`, `apps/web/src/hooks/**`
- shared pure logic: `packages/shared/src/**`
- backend and data model: `convex/**`

## Short Version

This repo is a multi-client chat platform with Convex at the center. Mobile and web are separate frontends with different offline strategies, shared code is intentionally narrow, and the mobile chat stack already follows a reusable component architecture that should be preserved as the baseline for future changes.
