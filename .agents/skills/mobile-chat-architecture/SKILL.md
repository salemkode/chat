---
name: mobile-chat-architecture
description: >
  Enforce mobile chat architecture in this repo. Use when implementing or refactoring
  mobile chat UI, message rendering, model selection dialogs, or optimistic updates.
  Rules: prefer reusable components over page-owned UI, do not collapse a full route
  into one screen component that owns the entire page, keep model dialog code in
  apps/mobile/src/components/dialog, share inbound/outbound message row layout across
  new/id/custom chat contexts, and use Convex optimistic updates for mutations only
  (not actions).
---

# Mobile Chat Architecture

## Required Rules

1. **Do not move the full page into a single component.** Route files (e.g. `app/(app)/chat/[id].tsx`) must not be reduced to only `<ChatScreen />` or one catch-all that inlines the entire screen. Compose the page from **named** pieces (header, message list, composer, banners) imported from `components/chat` or `features/`, with the route file orchestrating layout and navigation—not one monolithic screen wrapper.
2. Use reusable components under `apps/mobile/src/components/chat` instead of page-owned chat UI.
3. Keep model dialog modules under `apps/mobile/src/components/dialog`.
4. Use one shared message row layout for both `assistant` and `user` roles across:
   - new chat mode,
   - existing chat mode,
   - custom chat mode.
5. Apply optimistic updates only on Convex **mutations** via `.withOptimisticUpdate(...)`.
6. Do not add optimistic behavior on Convex **actions**.
7. On optimistic mutation failure, rollback naturally via Convex and show inline non-blocking error feedback in UI.

## Implementation Notes

- Prefer **several** focused components per flow (e.g. `ChatHeader`, `MessageList`, `ChatComposer`) composed in the route or a thin layout wrapper—not one `ChatScreen` that owns everything.
- If a `ChatScreen` (or similar) exists for shared behavior, it should orchestrate **child** components, not replace the route’s responsibility to assemble the page.
- A shared chat shell (if used) should still support `mode: 'new' | 'existing' | 'custom'` and optional `threadId` via props passed from the route.
- `send(...)` should support creating a thread when `threadId` is absent.
- Route files should stay thin: imports + composition + navigation, not a single mega-component export as the only child.
