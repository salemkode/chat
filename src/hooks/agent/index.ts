// Agent React Hooks
// Migrated from @convex-dev/agent/react

export { toUIMessages, type UIMessage } from '@/lib/agent/UIMessages'

export { optimisticallySendMessage } from './optimisticallySendMessage.js'
export { useSmoothText } from './useSmoothText.js'
export { SmoothText } from './SmoothText.js'
export {
  type ThreadMessagesQuery,
  useThreadMessages,
  useStreamingThreadMessages,
} from './useThreadMessages.js'
export { type UIMessagesQuery, useUIMessages } from './useUIMessages.js'
export { useStreamingUIMessages } from './useStreamingUIMessages.js'
