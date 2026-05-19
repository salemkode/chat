# Chat attachments, multi-model threads, and context

This page describes how file uploads are ingested, how the same thread can use different models across turns, and how stored transcripts relate to what the model actually sees (including what is *not* compressed or archived away).

## File uploads

### Client flow

- **Web** (`apps/web/src/hooks/chat-data/send.ts`): the UI obtains a Convex file upload URL from `agents.generateAttachmentUploadUrl`, then `POST`s each selected `File` to that URL with a `Content-Type` matching the file. The JSON response yields a `storageId` that is sent to `agents.generateMessage` inside the `attachments` array.
- **Mobile** (`apps/mobile/src/components/chat/attachment-sheet.tsx`, `apps/mobile/src/components/chat/attachment-context.tsx`, `apps/mobile/src/hooks/use-send-message.ts`): the attachment sheet adds files from the system document picker, photo library, or camera into shared composer state. The selected model’s resolved attachment media types gate which picks are accepted. On send, the app reads each local URI as raw bytes (via `expo-file-system` `File` when available, otherwise `fetch(uri).blob()`), `POST`s that body to `agents.generateAttachmentUploadUrl` with a `Content-Type` matching the resolved MIME type (same contract as web — not multipart form data), and forwards `{ storageId, filename, mediaType }` to `agents.generateMessage`. Filenames are normalized (NFC, no path segments) before upload metadata is sent.

### Server flow (`convex/agents.ts`)

1. **`generateAttachmentUploadUrl`** — authenticated mutation; returns `ctx.storage.generateUploadUrl()` so only signed-in users can stage blobs.
2. **`registerChatAttachments`** (inside `generateMessage`) — for each attachment:
   - Loads **storage metadata** (including `sha256`).
   - Validates **MIME type** against the **selected model’s** allowed attachment types (`convex/lib/modelAttachmentPolicy.ts`: capabilities, explicit `supportedAttachmentMediaTypes`, provider rules such as DeepSeek text-only).
   - **Dedupes** by hash: looks up `chatFiles` via `by_hash`. If the bytes already exist, the existing `chatFiles` row is reused and **`refcount` is incremented**; otherwise a new row is inserted and refcount is set.
3. **`saveUserPromptMessage`** — resolves each file’s **signed URL** from Convex storage, builds multimodal **`parts`** (text + `file` parts with `url` + `mediaType`), stores **`fileIds`** on the `chatMessages` row, and persists the normalized `message` payload.

Attachment shape accepted by `generateMessage`: `storageId`, optional `filename`, optional `mediaType` (`chatAttachmentValidator` in `agents.ts`).

## Multi-model conversations (one thread, many models)

- The **thread** (`chatThreads`) does **not** store a default model. Model choice is **per request**: the client passes `modelId` (`Id<'models'>`) into `generateMessage` or `regenerateMessage`, or uses **auto routing** (Convex actions under `modelRouter`) to resolve a model document id before calling the mutation.
- Each **assistant** row records which stack produced it: `chatMessages.model` and `chatMessages.provider` are set when the pending assistant message is created (`createPendingAssistantMessage`).
- **Follow-up messages** use whichever model the user(or Auto) selects next; prior assistant turns remain in the transcript as plain history.
- **Regenerate** (`regenerateMessage`): takes an existing **user** `promptMessageId` and a (possibly different) `modelId`. The server validates the prompt, fails prior pending work for that turn, removes downstream assistant steps for that prompt, creates a new pending assistant message for the **new** model, and schedules `streamMessage` again. Attachments are **not** re-uploaded: they stay on the user message; the server checks the **new** provider still supports the prompt’s multimodal parts (`ensureProviderSupportsPromptAttachments`).

For routing philosophy and tables (`models`, `modelSelectionProfiles`, `routerEvents`, etc.), see [Model routing (research)](./research/05-model-routing.md).

## Stored history vs. model context (compression and truncation)

### What is **not** “compressed” in the database

- **`chatMessages` rows are full fidelity** for the product: `parts`, `text`, tool/stream metadata, assistant `model` / `provider`, and optional `fileIds`. There is **no** gzip-style compression layer on messages or threads.
- **`chatThreads.summary`** exists in the schema and is exposed on `chat.listThreads`, but **core chat flows in this repo do not populate it**; treat it as optional metadata rather than a rolled-up transcript.
- **Separate** from chat transcripts, the **memory** pipeline can distill facts into memory records (`convex/functions/memory*.ts`); that is durable memory, not a replacement row for the message history.

### What the model sees on each generation

- **Context assembly** for streaming (`internal.chatEngine.listContextMessages` / `agents.streamMessage`): loads up to **40** recent **`success`** messages for the thread (default limit), oldest-first after fetch.
- **Conversion to provider messages** (`convertPublicMessagesToModelMessages` in `agents.ts`):
  - **Assistant** turns are passed as **plain text** (`message.text`). Prior assistant outputs are **not** re-sent as multimodal parts.
  - **User** turns use **`parts`**: text plus **`file` parts** carrying the **stored signed URLs**, so historical image/PDF prompts remain visible to the model **if** they sit inside the loaded window and the provider accepts them on the current call.
- **System-side “excerpts”** (for example `getConversationSnapshot` in `chatEngine.ts` — short recent lines for thread-metadata tooling, or snippets for project suggestion) are **small text summaries for helpers**, not a substitute for full message storage.

So: **threads are not stored in a compressed archive**; **context to the LLM is a capped, recent slice** of full messages, with assistant history collapsed to text when building the provider payload.

## Lifecycle and bookkeeping notes

- **`chatFiles.refcount`** increases when a message registers an attachment. There is **no** mirrored decrement wired to message or thread deletion in the current Convex code paths this document was written against; storage deduplication still reduces duplicate bytes when the same file is reused.
- **Thread deletion** (`chat.deleteThread`) removes thread metadata and message rows (and streaming artifacts) in bounded batches; consider storage hygiene if you extend deletion to orphan `chatFiles` / blobs.

## Code map

| Concern | Location |
|--------|-----------|
| Upload URL + generate/regenerate | `convex/agents.ts` |
| Attachment policy | `convex/lib/modelAttachmentPolicy.ts` |
| User multimodal parts builder | `convex/lib/chatEngine.ts` (`buildUserParts`) |
| Context message list | `convex/chatEngine.ts` (`listContextMessages`) |
| Web upload + send | `apps/web/src/hooks/chat-data/send.ts` |
| Mobile upload + image compression | `apps/mobile/src/mobile-data/use-send-message.ts`, `apps/mobile/src/mobile-data/attachments.ts` |
| Schema | `convex/schema.ts` (`chatThreads`, `chatMessages`, `chatFiles`, …) |
