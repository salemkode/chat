import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect, useCallback } from 'react'
import { ChatMessageList } from '@/components/ChatMessageList'
import { useUIMessages } from '@convex-dev/agent/react'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatPage,
})

function ChatPage() {
  const { chatId } = Route.useParams()
  const { isAuthenticated, isLoading } = useConvexAuth()

  const availableModels = useQuery(api.admin.listEnabledModels)
  const [sending, setSending] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    undefined,
  )

  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !selectedModelId) {
      setSelectedModelId(
        availableModels.sort((a, b) => a.sortOrder - b.sortOrder)[0].modelId,
      )
    }
  }, [availableModels, selectedModelId])

  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    {
      threadId: chatId,
    },
    {
      initialNumItems: 30,
      stream: true,
    },
  )
  console.log('messages', messages)

  useEffect(() => {
    if (messages && messages.length > 0 && sending) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        setSending(false)
      }
    }
  }, [messages, sending])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 container">
          <SidebarTrigger />
          <h1 className="font-semibold text-foreground">Chat</h1>
        </div>
      </header>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] pointer-events-none" />

      <ChatMessageList messages={messages || []} />
    </div>
  )
}
