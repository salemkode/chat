import { useEffect, useMemo, useState } from 'react'
import { Alert } from 'react-native'
import { useAction } from 'convex/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { chatSuggestions } from '@chat/shared'
import {
  fallbackProjectNameFromMentionQuery,
  getProjectMention,
  isNewProjectMentionQuery,
  removeMentionToken,
} from '@chat/shared/logic/project-mention'
import { useDraft } from '../../mobile-data/use-draft'
import { createLocalThreadId, isLocalThreadId } from '../../mobile-data/local-thread-id'
import { api, type Id } from '../../lib/convexApi'
import { useModels } from '../../mobile-data/use-models'
import { useProjects } from '../../mobile-data/use-projects'
import { useSendMessage } from '../../mobile-data/use-send-message'
import { useMessages } from '../../mobile-data/use-message-list'
import { useThread } from '../../mobile-data/use-thread'
import { useChatOptimisticSendStore } from '../../store/chat-optimistic-send'
import { useNetworkStatus } from '../../utils/network-status'
import { CHAT_BG } from './constants'
import type { ChatScreenMode, LocalAttachment } from './types'

type MentionProjectOption =
  | {
      kind: 'new-project-ai'
      id: '__new_project_ai__'
      name: string
      description?: string
    }
  | {
      kind: 'project'
      id: string
      name: string
      description?: string
    }

type PendingProjectDraft = {
  name: string
  description?: string
  loading: boolean
  error?: string | null
  source?: 'ai' | 'fallback'
  reason?: string
}

export function useChatConversation({
  mode,
  threadId,
  showHeader = true,
  onThreadCreated,
}: {
  mode: ChatScreenMode
  threadId?: string
  showHeader?: boolean
  onThreadCreated?: (threadId: string, kind: 'local' | 'server') => void
}) {
  const insets = useSafeAreaInsets()
  const [localThreadId, setLocalThreadId] = useState<string | undefined>(threadId)
  const activeThreadId = threadId || localThreadId || undefined
  const suggestProjectFromContext = useAction(
    (
      api as typeof api & {
        projects: {
          suggestProjectFromContext: unknown
        }
      }
    ).projects.suggestProjectFromContext as never,
  )

  const thread = useThread(activeThreadId)
  const { messages } = useMessages(activeThreadId)
  const { isOnline } = useNetworkStatus()
  const { projects, createProject, assignThreadToProject, removeThreadFromProject } = useProjects()
  const { selectedModelId, models, setSelectedModelId, setFavorite } = useModels()
  const { draft, setDraft } = useDraft(activeThreadId ?? 'new')
  const { send, pickDocumentAttachments, pickImageAttachments, disabledReason } = useSendMessage()
  const createPendingSend = useChatOptimisticSendStore((state) => state.createPendingSend)
  const moveThreadKey = useChatOptimisticSendStore((state) => state.moveThreadKey)
  const markHandoff = useChatOptimisticSendStore((state) => state.markHandoff)
  const markFailed = useChatOptimisticSendStore((state) => state.markFailed)
  const clearFailedForThread = useChatOptimisticSendStore((state) => state.clearFailedForThread)
  const getPendingSendByMessageId = useChatOptimisticSendStore(
    (state) => state.getPendingSendByMessageId,
  )

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(thread?.projectId)
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [attachments, setAttachmentsState] = useState<LocalAttachment[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [pendingProjectDraft, setPendingProjectDraft] = useState<PendingProjectDraft | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)

  const setAttachments = (updater: (current: LocalAttachment[]) => LocalAttachment[]) => {
    setAttachmentsState((current) => updater(current))
  }

  const mention = useMemo(() => getProjectMention(draft, draft.length), [draft])
  const mentionOptions = useMemo(() => {
    if (!mention) return [] as MentionProjectOption[]

    const needle = mention.query.trim().toLowerCase()
    const matches = projects
      .filter((item) => {
        if (!needle) {
          return true
        }
        return `${item.name}\n${item.description || ''}`.toLowerCase().includes(needle)
      })
      .slice(0, 1)
      .map((project) => ({
        kind: 'project' as const,
        id: project.id,
        name: project.name,
        description: project.description,
      }))

    const newOption: MentionProjectOption = {
      kind: 'new-project-ai',
      id: '__new_project_ai__',
      name: 'New project with AI',
      description: 'Create and link a new project for this chat',
    }

    if (isNewProjectMentionQuery(mention.query)) {
      return [newOption, ...matches]
    }

    return [...matches, newOption]
  }, [mention, projects])

  useEffect(() => {
    setSelectedProjectId(thread?.projectId)
  }, [thread?.projectId])

  useEffect(() => {
    setLocalThreadId(threadId)
  }, [threadId])

  useEffect(() => {
    setPendingProjectDraft(null)
    setCreatingProject(false)
  }, [activeThreadId])

  const activeProject = projects.find((project) => project.id === selectedProjectId)
  const hasMessages = messages.length > 0
  const sendDisabled = disabledReason !== null || (!draft.trim() && attachments.length === 0)
  const selectedModelRecord = models.find((m) => m.modelId === selectedModelId)
  const modelLabel = selectedModelRecord?.displayName ?? selectedModelId ?? 'Model'
  const contextModelDocId = selectedModelRecord?.id as Id<'models'> | undefined
  const contextThreadId =
    activeThreadId !== undefined && !isLocalThreadId(activeThreadId) ? activeThreadId : undefined

  const title = thread?.title || (mode === 'new' ? 'New chat' : 'Chat')

  const handleSend = async () => {
    if (!selectedModelId) {
      Alert.alert('No model selected')
      return
    }

    const promptSnapshot = draft
    const attachmentsSnapshot = [...attachments]
    const modelDocId = models.find((item) => item.modelId === selectedModelId)?.id

    if (!promptSnapshot.trim() && attachmentsSnapshot.length === 0) {
      return
    }

    setInlineError(null)
    let threadForSend = activeThreadId
    if (!threadForSend) {
      threadForSend = createLocalThreadId()
      setLocalThreadId(threadForSend)
      onThreadCreated?.(threadForSend, 'local')
    }

    await setDraft('')
    setMentionOpen(false)
    setAttachmentsState([])

    const pending = createPendingSend({
      threadId: threadForSend,
      prompt: promptSnapshot,
      attachments: attachmentsSnapshot,
      modelDocId,
      projectId: selectedProjectId,
      searchEnabled,
    })

    try {
      const result = await send({
        threadId: threadForSend,
        prompt: promptSnapshot,
        modelDocId,
        projectId: selectedProjectId,
        searchEnabled,
        attachments: attachmentsSnapshot,
        onThreadResolved: async (resolvedThreadId) => {
          if (isLocalThreadId(threadForSend)) {
            moveThreadKey(threadForSend, resolvedThreadId)
            setLocalThreadId(resolvedThreadId)
            onThreadCreated?.(resolvedThreadId, 'server')
          }
        },
        onBeforeGenerate: () => {
          markHandoff(pending.clientSendId)
        },
      })

      if (result.threadId) {
        clearFailedForThread(result.threadId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message.'
      markFailed(pending.clientSendId, message)
      await setDraft(promptSnapshot)
      setAttachmentsState(attachmentsSnapshot)
      setInlineError(message)
    }
  }

  const handleRetryFailedMessage = (messageId: string) => {
    const failed = getPendingSendByMessageId(messageId)
    if (!failed || failed.status !== 'failed') {
      return
    }

    const applyRetry = (includeAttachments: boolean) => {
      void setDraft(failed.retryPayload.prompt)
      setAttachmentsState(includeAttachments ? failed.retryPayload.attachments : [])
      setMentionOpen(
        Boolean(getProjectMention(failed.retryPayload.prompt, failed.retryPayload.prompt.length)),
      )
      setInlineError(null)
    }

    if (!failed.retryPayload.attachments.length) {
      applyRetry(false)
      return
    }

    Alert.alert('Retry with attachments?', 'Choose how to restore this failed send.', [
      {
        text: 'Retry with attachments',
        onPress: () => applyRetry(true),
      },
      {
        text: 'Retry without attachments',
        onPress: () => applyRetry(false),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ])
  }

  const createFallbackPendingDraft = (args: {
    mentionQuery: string
    draftWithoutMention: string
    error?: string
  }): PendingProjectDraft => {
    const fallbackName = fallbackProjectNameFromMentionQuery(args.mentionQuery)
    const normalizedDraft = args.draftWithoutMention.replace(/\s+/g, ' ').trim()
    return {
      name: fallbackName,
      description: normalizedDraft ? normalizedDraft.slice(0, 160) : undefined,
      loading: false,
      error: args.error ?? null,
      source: 'fallback',
    }
  }

  const handleNewProjectMentionPick = async () => {
    if (!mention) {
      return
    }

    const draftWithoutMention = removeMentionToken(draft, mention)
    await setDraft(draftWithoutMention)
    setMentionOpen(false)
    setInlineError(null)
    setPendingProjectDraft({
      name: fallbackProjectNameFromMentionQuery(mention.query),
      description: undefined,
      loading: true,
      error: null,
    })

    if (!isOnline) {
      setPendingProjectDraft(
        createFallbackPendingDraft({
          mentionQuery: mention.query,
          draftWithoutMention,
          error: 'Project suggestions are unavailable offline.',
        }),
      )
      return
    }

    try {
      const suggestion = (await suggestProjectFromContext({
        threadId: contextThreadId,
        draft: draftWithoutMention,
        modelId: contextModelDocId,
        mentionQuery: mention.query,
      } as never)) as
        | {
            name: string
            description?: string
            source: 'ai' | 'fallback'
            reason?: string
          }
        | undefined

      if (!suggestion) {
        setPendingProjectDraft(
          createFallbackPendingDraft({
            mentionQuery: mention.query,
            draftWithoutMention,
          }),
        )
        return
      }

      setPendingProjectDraft({
        name: suggestion.name.trim() || fallbackProjectNameFromMentionQuery(mention.query),
        description: suggestion.description?.trim() || undefined,
        loading: false,
        error: null,
        source: suggestion.source,
        reason: suggestion.reason,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to suggest a project.'
      setPendingProjectDraft(
        createFallbackPendingDraft({
          mentionQuery: mention.query,
          draftWithoutMention,
          error: message,
        }),
      )
    }
  }

  const confirmMoveExistingProject = (projectName: string) =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        'Move chat to new project?',
        `This chat is already linked. Move it to ${projectName}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Move',
            onPress: () => resolve(true),
          },
        ],
      )
    })

  const handleConfirmCreateProject = async () => {
    if (!pendingProjectDraft || creatingProject) {
      return
    }

    const name = pendingProjectDraft.name.trim()
    if (!name) {
      setPendingProjectDraft((current) =>
        current
          ? {
              ...current,
              error: 'Project name is required.',
            }
          : current,
      )
      return
    }

    setCreatingProject(true)
    try {
      const created = (await createProject({
        name,
        description: pendingProjectDraft.description?.trim() || undefined,
      })) as { id: string } | null
      const createdProjectId = created?.id
      if (!createdProjectId) {
        throw new Error('Could not create project right now.')
      }

      if (contextThreadId) {
        if (thread?.projectId && thread.projectId !== createdProjectId) {
          const shouldMove = await confirmMoveExistingProject(name)
          if (!shouldMove) {
            setPendingProjectDraft(null)
            return
          }
        }

        await assignThreadToProject(contextThreadId, createdProjectId)
      }

      setSelectedProjectId(createdProjectId)
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
      setCreatingProject(false)
    }
  }

  return {
    bg: CHAT_BG,
    showHeader,
    header: {
      title,
      activeProjectName: activeProject?.name,
      onRemoveProject:
        contextThreadId !== undefined
          ? () => {
              setSelectedProjectId(undefined)
              void removeThreadFromProject(contextThreadId)
            }
          : undefined,
    },
    offlineBanner: { visible: !isOnline },
    messageList: {
      threadId: activeThreadId,
      title,
      messages,
      onRetryFailedMessage: handleRetryFailedMessage,
    },
    composer: {
      draft,
      setDraft: (value: string) => {
        void setDraft(value)
      },
      attachments,
      setAttachments,
      mentionOpen: mentionOpen && Boolean(mention),
      setMentionOpen,
      mentionOptions,
      onMentionPick: (optionId: string) => {
        if (!mention) {
          return
        }
        const option = mentionOptions.find((item) => item.id === optionId)
        if (!option) {
          return
        }
        if (option.kind === 'new-project-ai') {
          void handleNewProjectMentionPick()
          return
        }
        setSelectedProjectId(option.id)
        setPendingProjectDraft(null)
        void setDraft(removeMentionToken(draft, mention))
        setMentionOpen(false)
      },
      pendingProjectDraft,
      onPendingProjectNameChange: (name: string) => {
        setPendingProjectDraft((current) =>
          current
            ? {
                ...current,
                name,
              }
            : current,
        )
      },
      onPendingProjectDescriptionChange: (description: string) => {
        setPendingProjectDraft((current) =>
          current
            ? {
                ...current,
                description,
              }
            : current,
        )
      },
      onConfirmCreateProject: () => {
        void handleConfirmCreateProject()
      },
      onCancelCreateProject: () => setPendingProjectDraft(null),
      creatingProject,
      showSuggestions:
        !hasMessages &&
        !draft.trim() &&
        attachments.length === 0 &&
        !pendingProjectDraft &&
        !mentionOpen,
      suggestions: chatSuggestions,
      onSuggestionPick: (prompt: string) => {
        void setDraft(prompt)
        setMentionOpen(false)
        setInlineError(null)
      },
      modelLabel,
      onOpenModelPicker: () => setPickerOpen(true),
      searchEnabled,
      onToggleSearch: () => setSearchEnabled((c) => !c),
      onPickImage: async () => {
        const picked = await pickImageAttachments()
        setAttachments((current) => [...current, ...picked])
      },
      onPickDocument: async () => {
        const picked = await pickDocumentAttachments()
        setAttachments((current) => [...current, ...picked])
      },
      onSend: handleSend,
      sendDisabled,
      isOnline,
      bottomInset: insets.bottom,
      errorText: inlineError,
      contextThreadId,
      contextModelDocId,
    },
    modelPicker: {
      visible: pickerOpen,
      models,
      selectedModelId,
      onClose: () => setPickerOpen(false),
      onSelect: (modelId: string) => {
        void setSelectedModelId(modelId)
        setPickerOpen(false)
      },
      onToggleFavorite: async (modelId: string, isFavorite: boolean) => {
        try {
          setInlineError(null)
          await setFavorite(modelId, isFavorite)
        } catch (error) {
          setInlineError(error instanceof Error ? error.message : 'Failed to update favorite.')
        }
      },
      offline: !isOnline,
    },
  }
}
