import { SignIn } from '@clerk/clerk-react'
import { createFileRoute, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, AuthLoading, Authenticated, Unauthenticated } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/chat')({
  component: ChatLayout,
})

function ChatLayout() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex h-screen w-full items-center justify-center p-4 bg-background">
          <SignIn />
        </div>
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedChatLayout />
      </Authenticated>
    </>
  )
}

function AuthenticatedChatLayout() {
  const navigate = useNavigate()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const [isUserReady, setIsUserReady] = useState(false)
  const params = useParams({
    from: '/chat/$chatId',
    shouldThrow: false,
    select: (routeParams: unknown) => {
      if (
        routeParams &&
        typeof routeParams === 'object' &&
        'chatId' in routeParams &&
        typeof routeParams.chatId === 'string'
      ) {
        return { chatId: routeParams.chatId }
      }
      return { chatId: undefined }
    },
  })
  const availableModels = useQuery(
    api.admin.listEnabledModels,
    isUserReady ? {} : 'skip',
  )
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

  useEffect(() => {
    let isCancelled = false

    void ensureCurrentUser({})
      .then(() => {
        if (!isCancelled) {
          setIsUserReady(true)
        }
      })
      .catch((error) => {
        console.error('Failed to initialize current user:', error)
      })

    return () => {
      isCancelled = true
    }
  }, [ensureCurrentUser])

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

  if (!isUserReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={null} />

      <SidebarInset className="relative">
        <Outlet />

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
