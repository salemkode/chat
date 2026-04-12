import { generatePath, Outlet, useNavigate, useParams } from 'react-router'
import { chatSuggestions } from '@chat/shared'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useAction } from 'convex/react'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AIPromptInput } from '@/components/ai-prompt-input'
import { AppSidebar } from '@/components/app-sidebar'
import { AuthRedirect } from '@/components/auth-redirect'
import { ChatSuggestions } from '@/components/chat/ChatSuggestions'
import { ChatModelProvider, useChatModel } from '@/components/chat-model-context'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  dequeueQueuedMessage,
  enqueueQueuedMessage,
  QUEUE_CAPACITY,
  type QueuedMessage,
} from '@/lib/chat-generation'
import { readPendingNewChatProjectId, writePendingNewChatProjectId } from '@/lib/project-selection'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import {
  PendingSendsProvider,
  useCachedSessionStatus,
  useDraft,
  useGenerationState,
  useMessages,
  useModels,
  useProjects,
  usePendingSends,
  useSettings,
  useSendMessage,
  useThread,
} from '@/hooks/use-chat-data'

function toModelDocId(value?: string): Id<'models'> | undefined {
  return value as Id<'models'> | undefined
}

export default function ChatLayout() {
  const { isAuthenticatedOrOffline, isLoading, isOfflineReady } = useCachedSessionStatus()

  if (isLoading && !isOfflineReady) {
    return <AuthBootstrapShell />
  }

  if (!isAuthenticatedOrOffline) {
    return <AuthRedirect />
  }

  return <AuthenticatedChatLayout />
}

function AuthBootstrapShell() {
  return <AuthLoadingScreen />
}

function AuthenticatedChatLayout() {
  const isMobile = useIsMobile()
  const { chatId } = useParams()
  const threadId = chatId
  const [mobileComposerHeight] = useState(176)

  return (
    <SidebarProvider className="h-screen">
      <AppSidebar selectedThreadId={threadId ?? null} />

      <ChatModelProvider>
        <PendingSendsProvider>
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
        </PendingSendsProvider>
      </ChatModelProvider>
    </SidebarProvider>
  )
}

function ChatComposer({ threadId, mobile = false }: { threadId?: string; mobile?: boolean }) {
  const navigate = useNavigate()
  const suggestProjectFromContext = useAction(
    (
      api as typeof api & {
        projects: {
          suggestProjectFromContext: unknown
        }
      }
    ).projects.suggestProjectFromContext as never,
  )
  const { models } = useModels()
  const { settings } = useSettings()
  const { projects, createProject, assignThreadToProject } = useProjects()
  const { send, stop, disabledReason } = useSendMessage()
  const {
    clearFailedSendsForThread,
    clearPendingSend,
    createPendingSend,
    markPendingFailed,
    markPendingHandoff,
    movePendingSendToThread,
  } = usePendingSends()
  const thread = useThread(threadId)
  const { messages } = useMessages(threadId)
  const { activeGeneration } = useGenerationState(messages || [])
  const draftKey = threadId || 'new'
  const { draft, setDraft } = useDraft(draftKey)
  const { selectedModelId, setSelectedModelId } = useChatModel()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined)
  const [isComposerEmpty, setIsComposerEmpty] = useState(true)
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [isQueueDispatching, setIsQueueDispatching] = useState(false)
  const [pendingProjectDraft, setPendingProjectDraft] = useState<{
    name: string
    description?: string
    loading: boolean
    error?: string | null
    source?: 'ai' | 'fallback'
    reason?: string
  } | null>(null)
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  useEffect(() => {
    if (threadId) {
      setSelectedProjectId(thread?.projectId)
      return
    }

    setSelectedProjectId(readPendingNewChatProjectId())
  }, [thread?.projectId, threadId])

  useEffect(() => {
    setPendingProjectDraft(null)
    setIsCreatingProject(false)
  }, [threadId])

  const selectedModelDocId = useMemo(
    () =>
      models.find((model: { modelId: string; id: string }) => model.modelId === selectedModelId)
        ?.id,
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
      const pending = createPendingSend({
        threadKey: threadId ?? 'new',
        prompt: input.text,
        attachments: input.attachments,
      })

      const result = await send({
        text: input.text,
        threadId,
        modelDocId: toModelDocId(input.modelDocId),
        projectId: input.projectId as Id<'projects'> | undefined,
        searchEnabled: input.searchEnabled,
        searchMode: input.searchMode,
        reasoning: input.reasoning,
        attachments: input.attachments,
        onThreadReady: async (resolvedThreadId) => {
          movePendingSendToThread(pending.clientSendId, resolvedThreadId)
          if (!threadId) {
            writePendingNewChatProjectId(undefined)
            await navigate(generatePath('/:chatId', { chatId: resolvedThreadId }))
          }
        },
        onBeforeGenerate: () => {
          markPendingHandoff(pending.clientSendId)
        },
        onError: (error) => {
          markPendingFailed(pending.clientSendId, error.message)
        },
      })

      clearPendingSend(pending.clientSendId)
      clearFailedSendsForThread(threadId ?? 'new')
      if (result.threadId && result.threadId !== (threadId ?? 'new')) {
        clearFailedSendsForThread(result.threadId)
      }
      return result
    },
    [
      clearFailedSendsForThread,
      clearPendingSend,
      createPendingSend,
      markPendingFailed,
      markPendingHandoff,
      movePendingSendToThread,
      navigate,
      send,
      threadId,
    ],
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
    [activeGeneration?.promptMessageId, isQueueDispatching, sendNow, stop, threadId],
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
  }, [activeGeneration, dispatchNextQueued, queuedMessages.length, threadId])

  async function handleSendMessage(
    text: string,
    opts: {
      searchEnabled: boolean
      searchMode: 'auto' | 'required'
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
      searchMode: opts.searchMode,
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

  const handleNewProjectMentionSelect = useCallback(
    async (args: { mentionQuery: string; draftWithoutMention: string }) => {
      const result = (await suggestProjectFromContext({
        threadId,
        draft: args.draftWithoutMention,
        modelId: selectedModelDocId,
        mentionQuery: args.mentionQuery,
      } as never)) as
        | {
            name: string
            description?: string
            source: 'ai' | 'fallback'
            reason?: string
          }
        | undefined
      return result
    },
    [selectedModelDocId, suggestProjectFromContext, threadId],
  )

  const handleConfirmCreateProject = useCallback(
    async (values: { name: string; description?: string }) => {
      if (isCreatingProject) {
        return
      }

      setIsCreatingProject(true)
      try {
        const created = (await createProject({
          name: values.name,
          description: values.description,
        })) as { id: string } | null

        const nextProjectId = created?.id
        if (!nextProjectId) {
          throw new Error('Could not create project right now.')
        }

        if (threadId) {
          if (thread?.projectId && thread.projectId !== nextProjectId) {
            const confirmed = window.confirm(
              `Move this chat from ${thread.projectName || 'its current project'} to ${values.name}?`,
            )
            if (!confirmed) {
              setPendingProjectDraft(null)
              return
            }
          }

          await assignThreadToProject(threadId, nextProjectId as Id<'projects'>)
        } else {
          writePendingNewChatProjectId(nextProjectId)
        }

        setSelectedProjectId(nextProjectId)
        setPendingProjectDraft(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create project.'
        setPendingProjectDraft((current) =>
          current
            ? {
                ...current,
                loading: false,
                error: message,
              }
            : current,
        )
      } finally {
        setIsCreatingProject(false)
      }
    },
    [
      assignThreadToProject,
      createProject,
      isCreatingProject,
      thread?.projectId,
      thread?.projectName,
      threadId,
    ],
  )

  const showSuggestions =
    (messages || []).length === 0 && isComposerEmpty

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {showSuggestions ? (
        <div className="w-full rounded-3xl border border-border/70 bg-background/70 p-3">
          <div className="mb-3">
            <div className="text-sm font-medium text-foreground">Try one to start</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Suggestions fill the composer so you can adjust them before sending.
            </div>
          </div>
          <ChatSuggestions
            suggestions={chatSuggestions}
            onSelect={(prompt) => {
              void setDraft(prompt)
            }}
          />
        </div>
      ) : null}

      <AIPromptInput
        value={draft}
        onValueChange={(value) => void setDraft(value)}
        onSubmit={handleSendMessage}
        mobile={mobile}
        onEmptyStateChange={setIsComposerEmpty}
        disabled={disabledReason !== null}
        footerText={
          disabledReason === 'offline'
            ? 'Offline mode is read-only. Cached chats stay available until you reconnect.'
            : undefined
        }
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={(nextProjectId) => {
          setPendingProjectDraft(null)
          if (!threadId) {
            setSelectedProjectId(nextProjectId)
            writePendingNewChatProjectId(nextProjectId)
            return
          }

          if (!nextProjectId && thread?.projectId) {
            return
          }

          if (thread?.projectId && nextProjectId && thread.projectId !== nextProjectId) {
            const nextProjectName =
              projects.find((project: (typeof projects)[number]) => project.id === nextProjectId)
                ?.name || 'the selected project'

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
        contextThreadId={threadId}
        contextModelDocId={selectedModelDocId}
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
          (settings?.reasoningLevel as 'low' | 'medium' | 'high' | undefined) ?? 'medium'
        }
        onNewProjectMentionSelect={handleNewProjectMentionSelect}
        pendingProjectDraft={pendingProjectDraft}
        onPendingProjectDraftChange={setPendingProjectDraft}
        onConfirmCreateProject={handleConfirmCreateProject}
        onCancelCreateProject={() => setPendingProjectDraft(null)}
        creatingProject={isCreatingProject}
      />
    </div>
  )
}
