import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import type { Id } from '@convex/_generated/dataModel'
import { Loader2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { AppSidebar } from '@/components/app-sidebar'
import { AuthRedirect } from '@/components/auth-redirect'
import {
  ChatModelProvider,
  useChatModel,
} from '@/components/chat-model-context'
import { useIsMobile } from '@chat/shared/hooks/use-mobile'
import {
  dequeueQueuedMessage,
  enqueueQueuedMessage,
  QUEUE_CAPACITY,
  type QueuedMessage,
} from '@/lib/chat-generation'
import {
  readPendingNewChatProjectId,
  writePendingNewChatProjectId,
} from '@/lib/project-selection'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  useCachedSessionStatus,
  useDraft,
  useGenerationState,
  useMessages,
  useModels,
  useProjects,
  useSettings,
  useSendMessage,
  useThread,
} from '@/hooks/use-chat-data'

export const Route = createFileRoute('/_layout')({
  ssr: false,
  component: ChatLayout,
})

function toModelDocId(value?: string): Id<'models'> | undefined {
  return value as Id<'models'> | undefined
}

function ChatLayout() {
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

  return <AuthenticatedChatLayout />
}

function AuthenticatedChatLayout() {
  const isMobile = useIsMobile()
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
  const threadId = params?.chatId
  const [mobileComposerHeight] = useState(176)

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={threadId ?? null} />

      <ChatModelProvider>
        <SidebarInset
          className="relative min-h-0"
          style={
            isMobile
              ? ({
                  '--mobile-header-height': '52px',
                  '--mobile-composer-height': `${mobileComposerHeight}px`,
                } as CSSProperties)
              : undefined
          }
        >
          <div className="min-h-0 flex-1">
            <Outlet />
          </div>

          <div className="shrink-0">
            <div className="mx-auto w-full max-w-3xl px-2 sm:px-4">
              <ChatComposer threadId={threadId} mobile={isMobile} />
            </div>
          </div>
        </SidebarInset>
      </ChatModelProvider>
    </SidebarProvider>
  )
}

function ChatComposer({
  threadId,
  mobile = false,
}: {
  threadId?: string
  mobile?: boolean
}) {
  const navigate = useNavigate()
  const { models } = useModels()
  const { settings } = useSettings()
  const { projects } = useProjects()
  const { send, stop, disabledReason } = useSendMessage()
  const thread = useThread(threadId)
  const { messages } = useMessages(threadId)
  const { activeGeneration } = useGenerationState(messages || [])
  const draftKey = threadId || 'new'
  const { draft, setDraft } = useDraft(draftKey)
  const { selectedModelId, setSelectedModelId } = useChatModel()
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(undefined)
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [isQueueDispatching, setIsQueueDispatching] = useState(false)

  useEffect(() => {
    if (threadId) {
      setSelectedProjectId(thread?.projectId)
      return
    }

    setSelectedProjectId(readPendingNewChatProjectId())
  }, [thread?.projectId, threadId])

  const selectedModelDocId = useMemo(
    () =>
      models.find(
        (model: { modelId: string; id: string }) =>
          model.modelId === selectedModelId,
      )?.id,
    [models, selectedModelId],
  )
  const selectedModel = useMemo(
    () =>
      models.find(
        (model: {
          modelId: string
          supportsReasoning?: boolean
          reasoningLevels?: Array<'low' | 'medium' | 'high'>
          defaultReasoningLevel?: 'off' | 'low' | 'medium' | 'high'
        }) => model.modelId === selectedModelId,
      ),
    [models, selectedModelId],
  )

  const sendNow = useCallback(
    async (input: QueuedMessage) => {
      const result = await send({
        text: input.text,
        threadId,
        modelDocId: toModelDocId(input.modelDocId),
        projectId: input.projectId as Id<'projects'> | undefined,
        searchEnabled: input.searchEnabled,
        reasoning: input.reasoning,
        attachments: input.attachments,
      })

      if (!threadId) {
        writePendingNewChatProjectId(undefined)
      }

      if (result.threadId && result.threadId !== threadId) {
        await navigate({ to: '/$chatId', params: { chatId: result.threadId } })
      }
    },
    [navigate, send, threadId],
  )

  const dispatchNextQueued = useCallback(
    async (forceStopFirst: boolean) => {
      if (isQueueDispatching) {
        return
      }

      let nextItem: QueuedMessage | null = null
      setQueuedMessages((current) => {
        const next = dequeueQueuedMessage(current)
        nextItem = next.item
        return next.queue
      })

      if (!nextItem) {
        return
      }

      setIsQueueDispatching(true)
      try {
        if (forceStopFirst && threadId && activeGeneration?.promptMessageId) {
          await stop({
            threadId,
            promptMessageId: activeGeneration.promptMessageId,
          })
        }
        await sendNow(nextItem)
      } catch (error) {
        setQueuedMessages((current) => [nextItem as QueuedMessage, ...current])
        throw error
      } finally {
        setIsQueueDispatching(false)
      }
    },
    [
      activeGeneration?.promptMessageId,
      isQueueDispatching,
      sendNow,
      stop,
      threadId,
    ],
  )

  useEffect(() => {
    setQueuedMessages([])
    setIsQueueDispatching(false)
  }, [threadId])

  useEffect(() => {
    if (!threadId || activeGeneration || queuedMessages.length === 0) {
      return
    }

    void dispatchNextQueued(false).catch(() => {
      // sendNow errors are surfaced by the composer on direct sends.
    })
  }, [
    activeGeneration,
    dispatchNextQueued,
    queuedMessages.length,
    threadId,
  ])

  async function handleSendMessage(
    text: string,
    opts: {
      searchEnabled: boolean
      projectId?: string
      attachments: File[]
      reasoning: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
    },
  ) {
    const payload: QueuedMessage = {
      text,
      modelDocId: selectedModelDocId,
      projectId: opts.projectId,
      searchEnabled: opts.searchEnabled,
      reasoning: opts.reasoning,
      attachments: opts.attachments,
    }

    if (threadId && activeGeneration) {
      const next = enqueueQueuedMessage(queuedMessages, payload, QUEUE_CAPACITY)
      if (next.overflow) {
        throw new Error(`Queue full (${QUEUE_CAPACITY}). Wait or stop current response.`)
      }
      setQueuedMessages(next.queue)
      return
    }

    await sendNow(payload)
  }

  return (
    <AIPromptInput
      value={draft}
      onValueChange={(value) => void setDraft(value)}
      onSubmit={handleSendMessage}
      mobile={mobile}
      disabled={disabledReason !== null}
      footerText={
        disabledReason === 'offline'
          ? 'Offline mode is read-only. Cached chats stay available until you reconnect.'
          : undefined
      }
      projects={projects}
      selectedProjectId={selectedProjectId}
      onProjectChange={(nextProjectId) => {
        if (!threadId) {
          setSelectedProjectId(nextProjectId)
          writePendingNewChatProjectId(nextProjectId)
          return
        }

        if (!nextProjectId && thread?.projectId) {
          return
        }

        if (
          thread?.projectId &&
          nextProjectId &&
          thread.projectId !== nextProjectId
        ) {
          const nextProjectName =
            projects.find(
              (project: (typeof projects)[number]) =>
                project.id === nextProjectId,
            )?.name || 'the selected project'

          if (
            !window.confirm(
              `Move this chat from ${thread.projectName || 'its current project'} to ${nextProjectName}?`,
            )
          ) {
            return
          }
        }

        setSelectedProjectId(nextProjectId)
      }}
      selectedModel={selectedModelId}
      onModelChange={setSelectedModelId}
      onEmptyEnter={() => {
        if (!threadId || queuedMessages.length === 0) {
          return
        }

        void dispatchNextQueued(Boolean(activeGeneration)).catch(() => {
          // Errors are shown through the composer error state on direct sends.
        })
      }}
      reasoningSupported={Boolean(selectedModel?.supportsReasoning)}
      reasoningLevels={selectedModel?.reasoningLevels}
      defaultReasoningLevel={selectedModel?.defaultReasoningLevel}
      userReasoningEnabled={Boolean(settings?.reasoningEnabled)}
      userReasoningLevel={
        (settings?.reasoningLevel as 'low' | 'medium' | 'high' | undefined) ??
        'medium'
      }
    />
  )
}
