export type { ChatMessage, ProjectSummary, ThreadSummary } from './types'
export type {
  StorageAdapter,
  AttachmentAdapter,
  EventsAdapter,
} from './adapters'
export type { ChatCoreApiRefs, ChatCoreContextValue, ChatCoreCacheAccessors } from './context'
export {
  ChatCoreProvider,
  useChatCoreContext,
} from './context'
export { ChatCoreShell } from './providers/chat-core-shell'
export { resolveChatSnapshot, isQueryLoading } from './cache/resolve-snapshot'
export {
  SendRegistryProvider,
  useSendRegistry,
  useSendRegistryOptional,
  createPendingPreviews,
} from './send/send-registry'
export type {
  SendRegistryContextValue,
} from './send/send-registry'
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
