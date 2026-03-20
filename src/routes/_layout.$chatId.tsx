import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { AuthRedirect } from '@/components/auth-redirect'
import { ChatMessageList } from '@/components/ChatMessageList'
import { ChatThreadHeader } from '@/components/chat/ChatThreadHeader'
import {
  useCachedSessionStatus,
  useGenerationState,
  useMessages,
  useProjects,
  useThread,
} from '@/hooks/use-chat-data'

export const Route = createFileRoute('/_layout/$chatId')({
  ssr: false,
  component: ChatPage,
})

function ChatPage() {
  const { isAuthenticatedOrOffline, isLoading, isOfflineReady } =
    useCachedSessionStatus()

  if (isLoading && !isOfflineReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticatedOrOffline) {
    return <AuthRedirect />
  }

  return <AuthenticatedChatPage />
}

function AuthenticatedChatPage() {
  const { chatId } = Route.useParams()
  const thread = useThread(chatId)
  const { removeThreadFromProject } = useProjects()
  const { messages, status } = useMessages(chatId)
  const { activeGeneration, isStalled } = useGenerationState(messages || [])
  const threadTitle = thread?.title || 'New Chat'

  return (
    <div className="flex h-full flex-col">
      <ChatThreadHeader
        title={threadTitle}
        threadId={chatId}
        projectId={thread?.projectId}
        projectName={thread?.projectName}
        onRemoveFromProject={
          thread?.projectId
            ? () => {
                if (
                  window.confirm(
                    `Remove this chat from ${thread?.projectName || 'its project'}?`,
                  )
                ) {
                  void removeThreadFromProject(chatId)
                }
              }
            : undefined
        }
      />

      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] md:block" />

      <ChatMessageList
        threadId={chatId}
        messages={messages || []}
        isLoading={status === 'LoadingFirstPage'}
        activeAssistantMessageId={activeGeneration?.message.id}
        stalledAssistantMessageId={
          isStalled ? activeGeneration?.message.id : undefined
        }
      />
    </div>
  )
}
