import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { Loader2, MessageSquare, WifiOff } from 'lucide-react'
import { ChatMessageList } from '@/components/ChatMessageList'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  useMessages,
  useOfflineStatus,
  useThread,
} from '@/offline/repositories'

export const Route = createFileRoute('/_layout/$chatId')({
  component: ChatPage,
})

function ChatPage() {
  const { isLoading } = useConvexAuth()
  const { isAuthenticatedOrOffline, isOfflineReady } = useOfflineStatus()

  if (isLoading && !isOfflineReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticatedOrOffline) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-3">
          <WifiOff className="mx-auto size-8 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Offline access unavailable</h1>
          <p className="text-sm text-muted-foreground">
            Sign in online once so this device can cache your chat history.
          </p>
        </div>
      </div>
    )
  }

  return <AuthenticatedChatPage />
}

function AuthenticatedChatPage() {
  const { chatId } = Route.useParams()
  const thread = useThread(chatId)
  const { messages } = useMessages(chatId)
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
          </div>
        </div>
      </header>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] pointer-events-none" />

      <ChatMessageList messages={messages || []} />
    </div>
  )
}
