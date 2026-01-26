import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useAction, useConvexAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import { ChatMessageList } from '@/components/ChatMessageList'
import { useUIMessages } from '@/hooks/agent'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/chat/$chatId')({
  component: ChatPage,
})

interface Model {
  _id: string
  modelId: string
  displayName: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
}

function ChatPage() {
  const { chatId } = Route.useParams()
  const { isAuthenticated, isLoading } = useConvexAuth()

  const availableModels =
    (useQuery(api.admin.listEnabledModels) as Model[] | undefined) ?? []
  const [model, setModel] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !model) {
      setModel(
        availableModels.sort(
          (a: Model, b: Model) => a.sortOrder - b.sortOrder,
        )[0].modelId,
      )
    }
  }, [availableModels, model])

  const sendMessage = useAction(api.agents.generateMessage)
  const [sending, setSending] = useState(false)

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

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return

    setSending(true)

    try {
      await sendMessage({
        threadId: chatId,
        text,
        model,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      setSending(false)
    }
  }

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
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="font-semibold text-foreground">Chat</h1>
        </div>

        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-[180px] bg-muted border text-foreground h-9">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent className="bg-muted border text-foreground">
            {availableModels
              ?.sort((a: Model, b: Model) => a.sortOrder - b.sortOrder)
              .map((m: Model) => (
                <SelectItem key={m._id} value={m.modelId}>
                  {m.displayName}
                  {m.isFree && (
                    <span className="ml-1 text-xs text-green-400">(Free)</span>
                  )}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </header>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.05] pointer-events-none" />

      <ChatMessageList messages={messages || []} />

      <div className="p-4 border-t bg-background">
        <div className="max-w-4xl mx-auto">
          <AIPromptInput
            onSubmit={(text) => {
              void handleSendMessage(text)
            }}
            disabled={sending}
          />
          <div className="text-center mt-2">
            <p className="text-[10px] text-muted-foreground">
              AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
