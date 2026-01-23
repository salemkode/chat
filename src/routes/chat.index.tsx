import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles } from 'lucide-react'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { SidebarTrigger } from '@/components/ui/sidebar'

export const Route = createFileRoute('/chat/')({
  component: NewChatIndex,
})

interface Model {
  _id: string
  modelId: string
  displayName: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
}

function NewChatIndex() {
  const navigate = useNavigate()
  const availableModels = useQuery(api.admin.listEnabledModels) as
    | Model[]
    | undefined
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

  const createThread = useMutation(api.agents.createChatThread)
  const sendMessage = useAction(api.agents.generateMessage)
  const [sending, setSending] = useState(false)

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return

    setSending(true)

    try {
      const threadId = await createThread({ title: text.substring(0, 30) })
      localStorage.setItem(
        `pending-message-${threadId}`,
        JSON.stringify({ text, model }),
      )
      void navigate({ to: `/chat/${threadId}` })
      await sendMessage({
        threadId,
        text,
        model,
      })
      localStorage.removeItem(`pending-message-${threadId}`)
    } catch (error) {
      console.error('Failed to send message:', error)
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="h-14 flex items-center justify-between px-4 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <h1 className="font-semibold">✨ New Chat</h1>
        </div>

        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels
              ?.sort((a: Model, b: Model) => a.sortOrder - b.sortOrder)
              .map((m: Model) => (
                <SelectItem key={m._id} value={m.modelId}>
                  {m.displayName}
                  {m.isFree && <span className="ml-1 text-xs">(Free)</span>}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-semibold">How can I help you today?</h2>
        </div>

        <div className="w-full max-w-3xl relative">
          <AIPromptInput
            onSubmit={() => {
              void handleSendMessage
            }}
            disabled={sending}
          />
          <div className="text-center mt-4">
            <p className="text-xs text-muted-foreground">
              AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
