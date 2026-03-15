# Expo Client App Plan Using the Existing Convex + Clerk Backend

## Summary
- Add a new Expo mobile client inside the same repository as a separate app at `apps/mobile`.
- Keep the existing Vite web app and the current Convex backend in place.
- Reuse the current backend domains: Clerk auth, Convex users, agent threads/messages, projects, models, attachments, web search, and pinning.
- Exclude all admin and memory UI from mobile.
- Match the current client behavior where `@project` selects the active project context for the chat/message flow; it is not a stored inline mention entity.
- Match the current app’s practical offline behavior: cached read-only access when offline, with sending and mutations disabled.

## Scope
- Include:
  - Sign up, sign in, email verification, sign out
  - Chat list, new chat, open chat, delete chat, pin/unpin chat
  - Project-grouped sidebar behavior plus unfiled chats
  - Project list, project details, create/edit/delete project
  - Model picker with favorites
  - Composer with text, `@project`, web search toggle, image/PDF attachments
  - Cached offline viewing for session, chats, messages, models, projects, settings, drafts
  - Profile/settings screen with display name and bio editing
- Exclude:
  - Admin routes and admin controls
  - Memory routes and memory management
  - Message-level inline project mention storage
  - Push notifications
  - Voice input
  - Team/org UI
  - Share pages

## Repo and App Structure
- Keep the repo single-root and add `apps/mobile` instead of converting the whole repo to a workspace.
- Add a dedicated `apps/mobile/package.json` and Expo config.
- Configure Metro to watch the repo root so the mobile app can import `../../convex/_generated/api` and `../../convex/_generated/dataModel`.
- Add root convenience scripts that delegate into `apps/mobile`, for example `mobile:dev`, `mobile:ios`, `mobile:android`, and `mobile:typecheck`.
- Do not move the current web app or backend files.

## Mobile Tech Decisions
- Use `expo-router` for navigation.
- Use `@clerk/clerk-expo` for auth and request the same Clerk token template: `convex`.
- Use Convex React on mobile with Clerk-backed auth token injection.
- Use `expo-secure-store` for Clerk token cache.
- Use `expo-sqlite` for persistent offline cache tables.
- Use `@react-native-community/netinfo` for online/offline state.
- Use `expo-image-picker` and `expo-document-picker` for attachments.
- Use `@react-native-async-storage/async-storage` for small UI preferences such as selected model.
- Use `zustand` for transient mobile UI state only.

## Mobile Screens and Navigation
- Auth stack:
  - `sign-in`
  - `sign-up`
  - `verify-email`
- App shell:
  - `Chats` tab
  - `Projects` tab
  - `Profile` tab
  - `Chat` detail screen
  - `Project` detail screen
  - `Project create/edit` modal
  - `Model picker` bottom sheet
  - `Sidebar` sheet for project-grouped chats and unfiled chats
- The mobile sidebar sheet must mirror the visible web behavior:
  - New chat
  - New project
  - Project groups with expandable thread lists
  - Unfiled chats
  - Pin/unpin chat
  - Remove chat from project
  - Settings entry
  - Logout entry
- Do not surface section CRUD in mobile because the current visible web sidebar is project-based, not section-based.

## Backend Reuse and Changes
- Reuse existing Convex functions directly for:
  - `users.viewer`
  - `users.getSettings`
  - `users.updateSettings`
  - `projects.createProject`
  - `projects.listProjects`
  - `projects.updateProject`
  - `projects.deleteProject`
  - `projects.assignThreadToProject`
  - `projects.removeThreadFromProject`
  - `projects.getProjectForThread`
  - `projects.listThreadsByProject`
  - `chat.getThread`
  - `chat.listMessages`
  - `chat.deleteThread`
  - `agents.createChatThread`
  - `agents.generateMessage`
  - `agents.regenerateMessage`
  - `agents.generateAttachmentUploadUrl`
  - `agents.listThreadsWithMetadata`
  - `agents.setThreadPinned` or the existing pin mutation used by the web app
- Add one new user-facing Convex module `convex/models.ts`:
  - `listComposerModels`
  - `setComposerModelFavorite`
- `convex/models.ts` should expose the same enabled-model data currently assembled in `admin.listModelsWithProviders`, but under a user-facing namespace so mobile is not coupled to `admin.*`.
- No schema migration is required.
- No new tables are required.
- No change to Clerk/Convex auth configuration is required beyond mobile env wiring.

## Data and Cache Design
- Create mobile cache tables mirroring the current web offline records:
  - `session`
  - `threads`
  - `messages`
  - `models`
  - `projects`
  - `settings`
  - `drafts`
- Cache update rules:
  - On successful live query or message stream update, write normalized records into SQLite.
  - On app start, read cache first for immediate render.
  - When online and authenticated, refresh live data and overwrite cache with latest normalized records.
  - On logout, clear all cached domain data to prevent cross-user leakage.
- Offline behavior:
  - Allow opening cached chats, projects, profile, and models.
  - Disable create/update/delete/send/regenerate/upload actions while offline.
  - Show a visible read-only offline banner in chat, project, and profile surfaces.

## Chat Behavior
- Creating a new chat uses `agents.createChatThread`.
- Sending uses `agents.generateMessage`.
- Regenerate uses `agents.regenerateMessage`.
- Message streaming uses the same Convex agent UI message flow as the web app.
- Model picker:
  - Visible in the composer.
  - Show favorites first, then all enabled models.
  - Persist the last selected model locally.
  - Fallback order: last selected model, then first favorite, then first enabled model.
- `@project` behavior:
  - Typing `@` opens a filtered project picker.
  - Selecting a project removes the typed token from the composer and sets the active project badge above the input.
  - The selected project is passed as `projectId` to thread creation and message generation.
  - No inline mention entity is stored in message content.
- Search toggle:
  - Visible in the composer.
  - Default off.
  - Passed through as `searchEnabled`.
- Attachments:
  - Support images and PDFs only.
  - Attachment button opens actions for camera/photo library/document picker.
  - Upload via `generateAttachmentUploadUrl` and signed upload POST before calling `generateMessage`.

## Projects Behavior
- Projects tab lists all projects from `projects.listProjects`.
- Project detail shows:
  - Name
  - Description
  - Thread count
  - Threads belonging to the project from `projects.listThreadsByProject`
- Project actions:
  - Create project
  - Edit project
  - Delete project with confirm dialog
  - Start a new chat in that project
- Removing a thread from a project is available from the chat header and sidebar sheet.

## Profile Behavior
- Show current user from `users.viewer`.
- Allow editing:
  - `displayName`
  - `bio`
- Show email read-only.
- Show image from Clerk/Convex if present, but do not build image upload in mobile v1.
- Sign out through Clerk and clear mobile cache afterward.

## Public APIs, Interfaces, and Types
- New public Convex APIs:
  - `api.models.listComposerModels`
  - `api.models.setComposerModelFavorite`
- New mobile-internal normalized types:
  - `MobileOfflineSessionSnapshot`
  - `MobileOfflineThreadRecord`
  - `MobileOfflineMessageRecord`
  - `MobileOfflineModelRecord`
  - `MobileOfflineProjectRecord`
  - `MobileOfflineSettingsRecord`
  - `MobileOfflineDraftRecord`
- No backend table/interface changes for messages, threads, projects, or users.
- No message schema changes for project mentions.

## Testing and Validation
- Unit tests:
  - `@project` parsing and picker selection behavior
  - model selection fallback logic
  - thread grouping into projects and unfiled buckets
  - cache normalization and overwrite behavior
  - offline gating for mutations
- Component tests:
  - auth forms
  - composer with model/search/attachments/project badge
  - sidebar sheet behavior
  - project CRUD forms
  - offline banners and disabled states
- Integration tests:
  - sign up -> verify -> sign in -> create chat -> send message
  - create project -> start project chat -> remove chat from project
  - favorite a model -> persist and restore selection
  - attach image/PDF -> upload -> send
  - go offline after initial sync -> reopen cached chat/project/profile
  - logout -> cache cleared
- Manual acceptance scenarios:
  - No admin or memory navigation is visible anywhere in mobile
  - Existing Convex deployment serves both web and mobile clients without separate backend setup
  - Offline is read-only, not full outbox sync

## Rollout
- Phase 1: mobile shell, auth, providers, and cache layer
- Phase 2: chat list, chat detail, composer, model picker, project picker
- Phase 3: projects tab, project detail, CRUD flows
- Phase 4: offline cache completion, attachment flows, polish, QA
- Phase 5: internal preview build for iOS and Android

## Assumptions and Defaults
- The Expo client is added as a second frontend in the same repo, not a replacement for the web app.
- The same Convex deployment and the same Clerk application are used.
- Mobile auth uses custom Clerk Expo email/password screens plus email verification, not hosted web auth.
- Offline parity means cached read-only access like the current practical web behavior, not queued offline sends.
- The visible mobile sidebar matches the current web sidebar behavior, which is project-grouped plus unfiled chats, not section management.
- `@project` remains a project-context selector exactly like the current web app.
- Attachment support is limited to images and PDFs.
- Profile image upload is deferred.
