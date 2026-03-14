import { createFileRoute } from '@tanstack/react-router'
import { Loader2, MessageSquare, Folder, X } from 'lucide-react'
import { AuthRedirect } from '@/components/auth-redirect'
import { ChatMessageList } from '@/components/ChatMessageList'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  useCachedSessionStatus,
  useMessages,
  useProjects,
  useThread,
} from '@/hooks/use-chat-data'

export const Route = createFileRoute('/_layout/$chatId')({
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
  const threadTitle = thread?.title || 'New Chat'

  return (
    <div className="flex h-full flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between sm:px-4 bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 container">
          <SidebarTrigger className="text-foreground hover:text-foreground hover:bg-muted" />
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" />
            <h1 className="font-semibold text-foreground truncate max-w-[300px]">
              {threadTitle}
            </h1>
            {thread?.projectId ? (
              <div className="flex items-center gap-2 rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                <Folder className="size-3.5" />
                <span>{thread.projectName || 'Project'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove this chat from ${thread.projectName || 'its project'}?`,
                      )
                    ) {
                      void removeThreadFromProject(chatId)
                    }
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] pointer-events-none" />

      <ChatMessageList
        threadId={chatId}
        messages={messages || []}
        isLoading={status === 'LoadingFirstPage'}
      />
    </div>
  )
}
