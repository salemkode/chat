import { useEffect, useMemo, useState } from 'react'
import { Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getProjectMention, removeMentionToken } from '@chat/shared/logic/project-mention'
import { useDraft } from '../../mobile-data/use-draft'
import { createLocalThreadId, isLocalThreadId } from '../../mobile-data/local-thread-id'
import { useModels } from '../../mobile-data/use-models'
import { useProjects } from '../../mobile-data/use-projects'
import { useSendMessage } from '../../mobile-data/use-send-message'
import { useThread } from '../../mobile-data/use-thread'
import { useChatOptimisticSendStore } from '../../store/chat-optimistic-send'
import { useNetworkStatus } from '../../utils/network-status'
import { CHAT_BG } from './constants'
import type { ChatScreenMode, LocalAttachment } from './types'
import { useVoiceComposer } from './useVoiceComposer'

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

  const thread = useThread(activeThreadId)
  const { isOnline } = useNetworkStatus()
  const { projects, removeThreadFromProject } = useProjects()
  const { selectedModelId, models, collections, setSelectedModelId, setFavorite } = useModels()
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

  const setAttachments = (updater: (current: LocalAttachment[]) => LocalAttachment[]) => {
    setAttachmentsState((current) => updater(current))
  }

  const mention = useMemo(() => getProjectMention(draft, draft.length), [draft])
  const mentionProjects = useMemo(() => {
    if (!mention) return []
    const needle = mention.query.trim().toLowerCase()
    if (!needle) return projects
    return projects.filter((item) =>
      `${item.name}\n${item.description || ''}`.toLowerCase().includes(needle),
    )
  }, [mention, projects])

  useEffect(() => {
    setSelectedProjectId(thread?.projectId)
  }, [thread?.projectId])

  useEffect(() => {
    setLocalThreadId(threadId)
  }, [threadId])

  const voiceComposer = useVoiceComposer({
    draft,
    setDraft,
    onDraftUpdated: (value) => {
      setMentionOpen(Boolean(getProjectMention(value, value.length)))
    },
  })

  const activeProject = projects.find((project) => project.id === selectedProjectId)
  const sendDisabled =
    disabledReason !== null ||
    voiceComposer.voiceState !== 'idle' ||
    (!draft.trim() && attachments.length === 0)
  const modelLabel =
    models.find((m) => m.modelId === selectedModelId)?.displayName ?? selectedModelId ?? 'Model'

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
      clearRequest(pending.clientSendId)

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
      setMentionOpen(Boolean(getProjectMention(failed.retryPayload.prompt, failed.retryPayload.prompt.length)))
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

  return {
    bg: CHAT_BG,
    showHeader,
    header: {
      title,
      activeProjectName: activeProject?.name,
      onRemoveProject:
        activeThreadId !== undefined
          ? () => {
              setSelectedProjectId(undefined)
              void removeThreadFromProject(activeThreadId)
            }
          : undefined,
    },
    offlineBanner: { visible: !isOnline },
    messageList: {
      threadId: activeThreadId,
      title,
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
      mentionProjects,
      onMentionPick: (projectId: string) => {
        if (!mention) {
          return
        }
        setSelectedProjectId(projectId)
        void setDraft(removeMentionToken(draft, mention))
        setMentionOpen(false)
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
      ...voiceComposer,
    },
    modelPicker: {
      visible: pickerOpen,
      models,
      collections,
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
