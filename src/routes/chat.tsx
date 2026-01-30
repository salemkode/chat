import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/chat')({
  component: ChatLayout,
  beforeLoad: ({ context }) => {
    console.log('context', context)
  },
})

function ChatLayout() {
  const navigate = useNavigate()
  const params = useParams({
    from: '/chat/$chatId',
    shouldThrow: false,
    select: (params: unknown) => {
      if (
        params &&
        typeof params === 'object' &&
        'chatId' in params &&
        typeof params.chatId === 'string'
      ) {
        return {
          chatId: params.chatId,
        }
      }
      return {
        chatId: undefined,
      }
    },
  })
  const availableModels = useQuery(api.admin.listEnabledModels)
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    undefined,
  )
  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !selectedModelId) {
      const model = availableModels.sort((a, b) => a.sortOrder - b.sortOrder)[0]
        .modelId
      setSelectedModelId(model)
    }
  }, [availableModels, selectedModelId])

  const createThread = useMutation(api.agents.createChatThread)
  const sendMessage = useMutation(api.agents.generateMessage)

  async function handleSendMessage(text: string) {
    if (!text.trim()) return

    const model = availableModels?.find((m) => m.modelId === selectedModelId)
    if (!model) {
      console.error('Model not found:', selectedModelId)
      return
    }

    try {
      let threadId = params?.chatId

      if (!threadId) {
        threadId = await createThread({ title: text.substring(0, 30) })
        await navigate({ to: `/chat/${threadId}` })
      }

      await sendMessage({
        threadId,
        prompt: text,
        modelId: model._id,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={null} />

      <SidebarInset className="relative">
        <Outlet />

        {/* Fixed bottom input */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
            <AIPromptInput
              onSubmit={(text) => void handleSendMessage(text)}
              selectedModel={selectedModelId}
              onModelChange={setSelectedModelId}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
