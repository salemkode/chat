import type { ReactNode } from 'react'
import type { AttachmentAdapter } from '../adapters'
import { ChatCoreProvider, type ChatCoreApiRefs, type ChatCoreCacheAccessors } from '../context'
import { SendRegistryProvider } from '../send/send-registry'

export function ChatCoreShell({
  apiRefs,
  isOnline,
  cacheAccessors,
  cacheRevision,
  attachmentAdapter,
  children,
}: {
  apiRefs: ChatCoreApiRefs
  isOnline?: boolean
  cacheAccessors?: ChatCoreCacheAccessors
  cacheRevision?: number
  attachmentAdapter?: AttachmentAdapter<unknown>
  children: ReactNode
}) {
  return (
    <SendRegistryProvider attachmentAdapter={attachmentAdapter}>
      <ChatCoreProvider
        apiRefs={apiRefs}
        isOnline={isOnline}
        cacheAccessors={cacheAccessors}
        cacheRevision={cacheRevision}
      >
        {children}
      </ChatCoreProvider>
    </SendRegistryProvider>
  )
}
