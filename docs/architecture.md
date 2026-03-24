# Chat Monorepo Architecture

## Purpose

This document describes the current repository architecture for the `chat` monorepo. It covers the main runtime systems, ownership boundaries, shared data flow, and the conventions already visible in code.

## System Summary

This repository is a pnpm workspace orchestrated by Turbo. The product is split into:

- `apps/mobile`: Expo + React Native mobile client
- `apps/web`: TanStack Start web client
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
  web (TanStack Start) ─┼─> Convex backend + database + AI orchestration
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

- `apps/mobile/app/_layout.tsx`: global bootstrap, fonts, splash screen, root providers
- `apps/mobile/src/providers/AppProviders.tsx`: Clerk + Convex + safe area providers
- `apps/mobile/app/(app)/_layout.tsx`: authenticated drawer shell

Chat architecture follows the repo rule set:

- route files compose chat using reusable components instead of owning the whole screen
- model dialog modules live in `apps/mobile/src/components/dialog`
- message presentation is shared through `apps/mobile/src/components/chat/MessageRow.tsx`

Current chat composition:

- `apps/mobile/app/(app)/chats.tsx`: new chat route
- `apps/mobile/app/(app)/chat/[id].tsx`: existing thread route
- both routes render `apps/mobile/src/components/chat/ChatPage.tsx`
- `ChatPage` composes `ChatHeader`, `MessageList`, `ChatComposer`, `OfflineBanner`, and `ModelPickerDialog`
- `useChatConversation.ts` assembles UI state, draft state, model state, project selection, send/retry logic, and inline error feedback

Mobile data and offline layer:

- `apps/mobile/src/mobile-data/*`: Convex-facing hooks for threads, messages, models, drafts, projects, and sending
- `apps/mobile/src/offline/*`: SQLite-backed cache and offline record types
- `apps/mobile/src/store/chat-optimistic-send.ts`: local optimistic send state and retry recovery

Important mobile rule already implemented:

- optimistic updates are attached to Convex mutations with `.withOptimisticUpdate(...)`
- optimistic behavior is not added to actions
- failures surface as inline non-blocking UI errors through composer state

### 2. Web App

The web app uses TanStack Start with client-side routing and Convex for live data.

Entry and shell:

- `apps/web/src/main.tsx`: client bootstrap
- `apps/web/src/router.tsx`: router creation and root Convex provider wiring
- `apps/web/src/routes/__root.tsx`: HTML shell, Clerk provider, theme provider, Convex client provider
- `apps/web/src/components/ConvexClientProvider.tsx`: auth-aware Convex client setup plus query cache provider

Web feature areas:

- `apps/web/src/routes/*`: route handlers for chat, auth, admin, share, signup, memory demo
- `apps/web/src/components/*`: chat UI, sidebar, prompt input, auth redirect, settings, markdown, model UI
- `apps/web/src/hooks/chat-data/*`: thread/message send flow, optimistic message list updates, local draft support
- `apps/web/src/offline/*`: localStorage-backed offline snapshots

The web app is currently the richer admin surface:

- provider and model management
- memory and share routes
- broader desktop-oriented UI primitives under `apps/web/src/components/ui`

### 3. Shared Package

`packages/shared` is intentionally small and contains code that should remain free of platform UI assumptions.

Current responsibilities:

- reusable hooks such as `use-online-status`
- thread grouping logic
- project mention parsing used by mobile chat composer
- shared admin types

This package should continue to hold pure logic and cross-platform primitives, not app-specific screen composition.

### 4. Convex Backend

Convex is the central system of record. It owns:

- authentication mapping from Clerk identities to app users
- database schema
- chat thread and message operations
- AI model/provider configuration
- memory extraction and retrieval
- billing and admin helpers

Primary modules:

- `convex/schema.ts`: tables for users, providers, models, routing policy, projects, shares, and related records
- `convex/agents.ts`: chat thread creation, generation, regeneration, upload URL creation, streaming lifecycle
- `convex/chat.ts`: chat queries such as message listing
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

- `@clerk/tanstack-react-start`
- custom auth token wiring inside `ConvexClientProvider.tsx`

Backend:

- Convex resolves the authenticated identity into the local `users` table
- product data is keyed to Convex user IDs, not directly to Clerk records

## Chat Flow

### Mobile

1. User lands in `chats.tsx` for a new conversation or `chat/[id].tsx` for an existing one.
2. Route renders `ChatPage`.
3. `useChatConversation` combines thread state, draft state, selected model, project mention, attachments, and online status.
4. `MessageList` reads merged live, cached, and optimistic messages.
5. `ChatComposer` submits through `useSendMessage`.
6. `useSendMessage` optionally creates a thread, uploads attachments, and calls Convex generation mutations.
7. Optimistic UI is inserted locally for thread and message rows.
8. If a mutation fails, the optimistic state rolls back and composer-level inline error text is shown.

### Web

1. Route loads chat shell and current thread from TanStack Router.
2. Data hooks subscribe to Convex queries.
3. `useSendMessage` in `apps/web/src/hooks/chat-data/send.ts` creates a thread if needed, uploads files, and calls generation mutations.
4. Optimistic assistant and user message placeholders are inserted with local query store updates.
5. Successful data is mirrored into offline browser storage for read-back.

## Offline Model

### Mobile

Mobile has a stronger local-first layer than web.

- message and thread snapshots are cached in `apps/mobile/src/offline/cache.ts`
- storage is backed by SQLite under `apps/mobile/src/offline/db.ts`
- drafts are persisted separately
- local thread IDs support optimistic sends before a server thread exists
- `chat-optimistic-send` store merges pending and failed sends into the rendered message list

This gives the mobile client:

- offline readback of cached threads/messages
- temporary local conversation continuity before server thread resolution
- inline retry recovery for failed sends

### Web

Web offline support is lighter and browser-oriented.

- local snapshots live in `apps/web/src/offline/local-cache.ts`
- drafts are kept in local storage helpers
- `ConvexQueryCacheProvider` keeps query subscriptions warm during navigation
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
3. backend creates the language model client for the provider
4. message generation is streamed into the chat thread
5. post-processing may trigger memory extraction or related bookkeeping

This design lets admin configuration change model availability without redeploying clients.

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
