import { useEffect, useMemo, useState } from 'react'
import { Alert } from 'react-native'
import { useAction } from 'convex/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  AUTO_MODEL_ID,
  chatSuggestions,
  isAttachmentMediaTypeAllowed,
  isAutoModelSelection,
  resolveModelAttachmentMediaTypes,
} from '@chat/shared'
import {
  fallbackProjectNameFromMentionQuery,
  getProjectMention,
  isNewProjectMentionQuery,
  removeMentionToken,
} from '@chat/shared/logic/project-mention'
import { toModelId } from '../../mobile-data/normalize'
import { useDraft } from '../../mobile-data/use-draft'
import { createLocalThreadId, isLocalThreadId } from '../../mobile-data/local-thread-id'
import { api } from '../../lib/convexApi'
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
  const { selectedModelId, models, autoModelAvailable, setSelectedModelId, setFavorite } =
    useModels()
  const { draft, setDraft } = useDraft(activeThreadId ?? 'new')
  const { send, pickDocumentAttachments, pickImageAttachments, disabledReason } = useSendMessage()
  const createPendingSend = useChatOptimisticSendStore((state) => state.createPendingSend)
  const moveThreadKey = useChatOptimisticSendStore((state) => state.moveThreadKey)
  const markHandoff = useChatOptimisticSendStore((state) => state.markHandoff)
  const markFailed = useChatOptimisticSendStore((state) => state.markFailed)
  const clearRequest = useChatOptimisticSendStore((state) => state.clearRequest)
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

  const selectedModelRecord = models.find((m) => m.modelId === selectedModelId)
  const modelLabel = isAutoModelSelection(selectedModelId)
    ? 'Auto'
    : (selectedModelRecord?.displayName ?? selectedModelId ?? 'Model')
  const attachmentMediaTypes = isAutoModelSelection(selectedModelId)
    ? resolveModelAttachmentMediaTypes({})
    : resolveModelAttachmentMediaTypes({
        capabilities: selectedModelRecord?.capabilities,
        supportedAttachmentMediaTypes: selectedModelRecord?.supportedAttachmentMediaTypes,
        attachmentValidationStatus: selectedModelRecord?.attachmentValidationStatus,
      })
  const attachmentsSupported = attachmentMediaTypes.length > 0
  const imageAttachmentsSupported = attachmentMediaTypes.some((mediaType) =>
    mediaType.startsWith('image/'),
  )
  const imageUnsupportedError = `${modelLabel} does not support image attachments. Remove images or choose a Vision model.`
  const attachmentUnsupportedError = attachmentsSupported
    ? `This model accepts: ${attachmentMediaTypes.join(', ')}`
    : `${modelLabel} does not support file attachments.`
  const hasUnsupportedImageAttachments =
    !imageAttachmentsSupported &&
    attachments.some((attachment) => attachment.mimeType.startsWith('image/'))
  const hasUnsupportedAttachments = attachments.some(
    (attachment) => !isAttachmentMediaTypeAllowed(attachment.mimeType, attachmentMediaTypes),
  )

  const activeProject = projects.find((project) => project.id === selectedProjectId)
  const hasMessages = messages.length > 0
  const sendDisabled =
    disabledReason !== null ||
    (!draft.trim() && attachments.length === 0) ||
    hasUnsupportedAttachments ||
    hasUnsupportedImageAttachments
  const contextModelDocId = toModelId(selectedModelRecord?.id)
  const contextThreadId =
    activeThreadId !== undefined && !isLocalThreadId(activeThreadId) ? activeThreadId : undefined

  const title = thread?.title || (mode === 'new' ? 'New chat' : 'Chat')

  useEffect(() => {
    if (hasUnsupportedAttachments) {
      setInlineError(attachmentUnsupportedError)
      return
    }
    if (hasUnsupportedImageAttachments) {
      setInlineError(imageUnsupportedError)
      return
    }

    setInlineError((current) =>
      current === imageUnsupportedError || current === attachmentUnsupportedError ? null : current,
    )
  }, [
    attachmentUnsupportedError,
    hasUnsupportedAttachments,
    hasUnsupportedImageAttachments,
    imageUnsupportedError,
  ])

  const submitOptimisticSend = async ({
    threadForSend,
    prompt,
    sendAttachments,
    modelDocId,
    projectId,
    sendSearchEnabled,
    sendSearchMode,
  }: {
    threadForSend: string
    prompt: string
    sendAttachments: LocalAttachment[]
    modelDocId?: string
    projectId?: string
    sendSearchEnabled: boolean
    sendSearchMode?: 'auto' | 'required'
  }) => {
    const pending = createPendingSend({
      threadId: threadForSend,
      prompt,
      attachments: sendAttachments,
      modelDocId,
      projectId,
      searchEnabled: sendSearchEnabled,
      searchMode: sendSearchMode,
    })

    try {
      const result = await send({
        threadId: threadForSend,
        prompt,
        modelDocId,
        projectId,
        searchEnabled: sendSearchEnabled,
        searchMode: sendSearchMode,
        attachments: sendAttachments,
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

      if (result.disabledReason === 'offline') {
        throw new Error('You are offline. Reconnect and tap Replay to try again.')
      }

      if (result.threadId) {
        clearFailedForThread(result.threadId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message.'
      markFailed(pending.clientSendId, message)
    }
  }

  const handleSend = async () => {
    if (!selectedModelId) {
      Alert.alert('No model selected')
      return
    }

    const promptSnapshot = draft
    const attachmentsSnapshot = [...attachments]
    const modelDocId = isAutoModelSelection(selectedModelId)
      ? undefined
      : models.find((item) => item.modelId === selectedModelId)?.id

    if (!promptSnapshot.trim() && attachmentsSnapshot.length === 0) {
      return
    }
    if (
      attachmentsSnapshot.some(
        (attachment) => !isAttachmentMediaTypeAllowed(attachment.mimeType, attachmentMediaTypes),
      )
    ) {
      setInlineError(attachmentUnsupportedError)
      return
    }
    if (
      !imageAttachmentsSupported &&
      attachmentsSnapshot.some((attachment) => attachment.mimeType.startsWith('image/'))
    ) {
      setInlineError(imageUnsupportedError)
      return
    }

    setInlineError(null)
    setMentionOpen(false)
    setAttachmentsState([])

    let threadForSend = activeThreadId
    if (!threadForSend) {
      threadForSend = createLocalThreadId()
      setLocalThreadId(threadForSend)
      onThreadCreated?.(threadForSend, 'local')
    }

    const draftKeysToClear = [activeThreadId ?? 'new']
    if (threadForSend !== activeThreadId) {
      draftKeysToClear.push(threadForSend)
    }
    void setDraft('', { persistTo: draftKeysToClear })

    await submitOptimisticSend({
      threadForSend,
      prompt: promptSnapshot,
      sendAttachments: attachmentsSnapshot,
      modelDocId,
      projectId: selectedProjectId,
      sendSearchEnabled: searchEnabled,
      sendSearchMode: searchEnabled ? 'required' : 'auto',
    })
  }

  const handleReplayFailedMessage = (messageId: string) => {
    const failed = getPendingSendByMessageId(messageId)
    if (!failed || failed.status !== 'failed') {
      return
    }

    clearRequest(failed.clientSendId)
    setInlineError(null)
    void submitOptimisticSend({
      threadForSend: failed.threadId,
      prompt: failed.replayPayload.prompt,
      sendAttachments: failed.replayPayload.attachments,
      modelDocId: failed.replayPayload.modelDocId,
      projectId: failed.replayPayload.projectId,
      sendSearchEnabled: failed.replayPayload.searchEnabled,
      sendSearchMode: failed.replayPayload.searchMode,
    })
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
      onReplayFailedMessage: handleReplayFailedMessage,
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
        mode === 'new' &&
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
        if (!imageAttachmentsSupported) {
          setInlineError(imageUnsupportedError)
          return
        }

        const picked = await pickImageAttachments()
        setAttachments((current) => [...current, ...picked])
      },
      onPickDocument: async () => {
        if (!attachmentsSupported) {
          setInlineError(attachmentUnsupportedError)
          return
        }
        const picked = await pickDocumentAttachments(attachmentMediaTypes)
        setAttachments((current) => [...current, ...picked])
      },
      onSend: handleSend,
      sendDisabled,
      attachmentMediaTypes,
      imageAttachmentsSupported,
      isOnline,
      bottomInset: insets.bottom,
      errorText: inlineError,
      contextThreadId,
      contextModelDocId,
    },
    modelPicker: {
      visible: pickerOpen,
      models: autoModelAvailable
        ? [
            {
              id: AUTO_MODEL_ID,
              modelId: AUTO_MODEL_ID,
              displayName: 'Auto',
              description: 'Let the backend Python router choose the model.',
              capabilities: undefined,
              isFavorite: false,
            },
            ...models,
          ]
        : models,
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
