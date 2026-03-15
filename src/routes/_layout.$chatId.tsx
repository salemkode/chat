import { createFileRoute } from '@tanstack/react-router'
import { Loader2, MessageSquare, Folder, X } from 'lucide-react'
import { AuthRedirect } from '@/components/auth-redirect'
import { ChatMessageList } from '@/components/ChatMessageList'
import { ShareChatDialog } from '@/components/chat/ShareChatDialog'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
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
  const isMobile = useIsMobile()
  const { chatId } = Route.useParams()
  const thread = useThread(chatId)
  const { removeThreadFromProject } = useProjects()
  const { messages, status } = useMessages(chatId)
  const threadTitle = thread?.title || 'New Chat'

  if (isMobile) {
    return (
      <div className="mobile-chat-page flex h-full min-h-0 flex-col">
        <header className="mobile-chat-header flex h-[calc(52px+env(safe-area-inset-top))] shrink-0 items-end px-3 pb-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <SidebarTrigger className="size-9 rounded-full bg-background/55 text-foreground shadow-sm hover:bg-background/70" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-foreground">
                {threadTitle}
              </h1>
            </div>
          </div>
        </header>

        {thread?.projectId ? (
          <div className="px-3 pt-2">
            <div className="mobile-thread-project-chip">
              <div className="flex min-w-0 items-center gap-2">
                <Folder className="size-3.5 text-muted-foreground" />
                <span className="truncate text-sm text-foreground/90">
                  {thread.projectName || 'Project'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground"
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
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <ChatMessageList
            threadId={chatId}
            messages={messages || []}
            isLoading={status === 'LoadingFirstPage'}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="h-14 shrink-0 border-b border-border bg-background/80 px-2 backdrop-blur-sm sm:px-4">
        <div className="mx-auto flex h-full w-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="text-foreground hover:text-foreground hover:bg-muted" />
            <div className="flex min-w-0 items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h1 className="max-w-[300px] truncate font-semibold text-foreground">
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
          <ShareChatDialog threadId={chatId} threadTitle={threadTitle} />
        </div>
      </header>

      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] md:block" />

      <ChatMessageList
        threadId={chatId}
        messages={messages || []}
        isLoading={status === 'LoadingFirstPage'}
      />
    </div>
  )
}
