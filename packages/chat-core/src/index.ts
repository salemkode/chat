export type { ChatMessage, ProjectSummary, ThreadSummary } from './types'
export type {
  StorageAdapter,
  AttachmentAdapter,
  EventsAdapter,
} from './adapters'
export type { ChatCoreApiRefs, ChatCoreContextValue } from './context'
export {
  ChatCoreProvider,
  useChatCoreContext,
} from './context'
export { useChatProjects } from './hooks/use-chat-projects'
export { useChatThreads } from './hooks/use-chat-threads'
export {
  compareThreadsForSidebar,
  groupThreadsByProject,
  groupThreadsByRelativeDate,
  getRelativeThreadDateGroup,
  type SidebarThreadLike,
} from './sidebar'
