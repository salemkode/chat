import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { Loader2, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  useDraft,
  useModels,
  useOfflineStatus,
  useSendMessage,
  useSyncController,
} from '@/offline/repositories'

export const Route = createFileRoute('/_layout')({
  component: ChatLayout,
})

const STORAGE_KEY = 'selected-model-id'

function ChatLayout() {
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
          <h1 className="text-xl font-semibold">
            Internet connection required
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in once while online to unlock offline access on this device.
          </p>
        </div>
      </div>
    )
  }

  return <AuthenticatedChatLayout />
}

function AuthenticatedChatLayout() {
  const navigate = useNavigate()
  const params = useParams({
    from: '/_layout/$chatId',
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
  const { models } = useModels()
  const { send, disabledReason } = useSendMessage()
  const { syncNow } = useSyncController()
  const draftKey = params?.chatId || 'new'
  const { draft, setDraft } = useDraft(draftKey)
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    undefined,
  )

  useEffect(() => {
    void syncNow()
  }, [syncNow])

  useEffect(() => {
    const storedModel =
      typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEY) || undefined
        : undefined
    if (storedModel) {
      setSelectedModelId(storedModel)
    }
  }, [])

  useEffect(() => {
    if (selectedModelId || models.length === 0) return
    setSelectedModelId(models[0]?.modelId)
  }, [models, selectedModelId])

  const selectedModelDocId = useMemo(
    () => models.find((model) => model.modelId === selectedModelId)?.id,
    [models, selectedModelId],
  )

  async function handleSendMessage(text: string) {
    const result = await send({
      text,
      threadId: params?.chatId,
      modelDocId: selectedModelDocId,
    })

    if (result.threadId && result.threadId !== params?.chatId) {
      await navigate({ to: '/$chatId', params: { chatId: result.threadId } })
    }
  }

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={params?.chatId ?? null} />

      <SidebarInset className="relative">
        <Outlet />

        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
            <AIPromptInput
              value={draft}
              onValueChange={(value) => void setDraft(value)}
              onSubmit={(text) => void handleSendMessage(text)}
              disabled={disabledReason === 'offline'}
              footerText={
                disabledReason === 'offline'
                  ? 'Reconnect to send. Your draft stays on this device.'
                  : undefined
              }
              selectedModel={selectedModelId}
              onModelChange={(modelId) => {
                setSelectedModelId(modelId)
                if (typeof window !== 'undefined') {
                  localStorage.setItem(STORAGE_KEY, modelId)
                }
              }}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
