/**
 * @chat/core — the single shared package for the whole chat product.
 *
 * It has two layers, both explained here so the codebase is easy to walk through:
 *
 *   1. Pure logic (this barrel's first block): model-picking rules, message
 *      ordering, sidebar grouping, ID helpers, brand icons, error catalog, etc.
 *      These files touch NO React/DOM, which means the Convex backend can safely
 *      import them too (the backend only imports `logic/display-name`).
 *
 *   2. React layer (second block): the chat "core" providers/hooks — ChatCoreProvider,
 *      send registry, thread messages, generation state, projects/threads hooks.
 *      These are consumed only by the client apps (web + mobile), never the backend.
 *
 * Keeping the pure layer first and React layer second is the one rule to remember.
 */

// --- Pure logic (no React; backend-safe) ---
export * from './admin-types'
export * from './hooks/use-mobile'
export * from './hooks/use-online-status'
export * from './logic/project-mention'
export * from './logic/chat-suggestions'
export * from './logic/client-keys'
export * from './logic/convex-ids'
export * from './logic/auto-model'
export * from './logic/model-browser-query'
export * from './logic/model-capabilities'
export * from './quran-ayah'
export * from './logic/thread-groups'
export * from './project-context'
export * from './brand-icons'

// --- React layer (client apps only) ---
export type { ChatMessage, ProjectSummary, ThreadSummary } from './types'
export type { StorageAdapter, AttachmentAdapter, EventsAdapter } from './adapters'
export type { ChatCoreApiRefs, ChatCoreContextValue, ChatCoreCacheAccessors } from './context'
export { ChatCoreProvider, useChatCoreContext } from './context'
export { ChatCoreShell } from './providers/chat-core-shell'
export { resolveChatSnapshot, isQueryLoading } from './cache/resolve-snapshot'
export {
  SendRegistryProvider,
  useSendRegistry,
  useSendRegistryOptional,
  createPendingPreviews,
} from './send/send-registry'
export type { SendRegistryContextValue } from './send/send-registry'
export type {
  InFlightSendRecord,
  PendingAttachmentPreview,
  SendPhase,
  CreateInFlightSendInput,
} from './send/send-types'
export {
  buildInFlightUserMessage,
  buildInFlightFailedAssistant,
  toInFlightSendForMerge,
} from './send/send-types'
export { useThreadMessages } from './messages/use-thread-messages'
export { useGenerationState } from './generation/use-generation-state'
export type {
  ActiveGenerationState,
  UseGenerationStateResult,
} from './generation/use-generation-state'
export type {
  UseThreadMessagesInput,
  UseThreadMessagesResult,
} from './messages/use-thread-messages'
export { useChatProjects } from './hooks/use-chat-projects'
export { useChatThreads } from './hooks/use-chat-threads'
export {
  compareThreadsForSidebar,
  groupThreadsByProject,
  groupThreadsByRelativeDate,
  getRelativeThreadDateGroup,
  type SidebarThreadLike,
} from './sidebar'
