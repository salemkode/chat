import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClientRequestId, createClientThreadKey } from '@chat/core/logic/client-keys'
import type { Id } from '@convex/_generated/dataModel'
import { useAction, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { createWebAttachmentAdapter } from '@/lib/chat-core-adapters'
import {
  CHAT_FOLLOW_LATEST_EVENT,
  CHAT_STREAM_RESUME_EVENT,
  dispatchChatEvent,
} from '@/lib/chat-events'
import { readDraft, writeDraft } from '@/hooks/chat-data/shared'
import {
  applyOptimisticGenerateMessage,
  applyOptimisticRegenerateMessage,
} from '@/hooks/chat-data/optimistic-list-messages'
import { applyOptimisticStopGeneration } from '@/hooks/chat-data/optimistic-stop-generation'
import { applyOptimisticCreateThread } from '@/hooks/chat-data/optimistic-threads'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return ''
}

function isExtraFieldValidationError(error: unknown, fieldName: string) {
  const message = getErrorMessage(error)
  return (
    message.includes('ArgumentValidationError') &&
    message.includes('extra field') &&
    message.includes(fieldName)
  )
}

function buildAttachmentSummary(
  attachments: File[] | undefined,
): { imageCount: number; fileCount: number; totalCount: number } | undefined {
  if (!attachments || attachments.length === 0) {
    return undefined
  }

  let imageCount = 0
  let fileCount = 0
  for (const attachment of attachments) {
    if (attachment.type.startsWith('image/')) {
      imageCount += 1
    } else {
      fileCount += 1
    }
  }

  return {
    imageCount,
    fileCount,
    totalCount: imageCount + fileCount,
  }
}

export function useDraft(threadId: string) {
  const [draft, setDraftState] = useState(() => readDraft(threadId))

  useEffect(() => {
    setDraftState(readDraft(threadId))
  }, [threadId])

  const setDraft = useCallback(
    async (value: string) => {
      setDraftState(value)
      writeDraft(threadId, value)
    },
    [threadId],
  )

  const resetDraft = useCallback(async () => {
    setDraftState('')
    writeDraft(threadId, '')
  }, [threadId])

  return { draft, setDraft, resetDraft }
}

export function useSendMessage() {
  const { isOnline } = useOnlineStatus()
  // Backwards-compatibility flags. These let the client keep talking to older
  // Convex deployments that don't yet recognise `clientThreadKey`, a stable
  // `clientRequestId`, or the search-mode arg. The first time the backend
  // rejects one of these as an unknown field, we flip the flag to false and
  // stop sending it. Safe to delete once every deployment understands all three.
  const supportsClientThreadKeyRef = useRef(true)
  const supportsClientRequestIdRef = useRef(true)
  const supportsSearchModeRef = useRef(true)
  const selectAutoModel = useAction(api.modelRouter.selectAutoModel)
  const selectAutoModelForPromptMessage = useAction(
    api.modelRouter.selectAutoModelForPromptMessage,
  )
  const createThread = useMutation(api.agents.createChatThread).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticCreateThread(
        localStore,
        args as {
          title?: string
          projectId?: string
          clientThreadKey?: string
        },
      )
    },
  )
  const generateAttachmentUploadUrl = useMutation(api.agents.generateAttachmentUploadUrl)
  const sendMessage = useMutation(api.agents.generateMessage).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticGenerateMessage(
        localStore,
        args.threadId,
        args.prompt,
        args.attachments,
        args.clientRequestId,
      )
    },
  )
  const regenerateMessage = useMutation(api.agents.regenerateMessage).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticRegenerateMessage(localStore, args.threadId, args.promptMessageId)
    },
  )
  const stopGeneration = useMutation(api.agents.stopGeneration).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticStopGeneration(localStore, args.threadId)
    },
  )

  const webAttachmentAdapter = useMemo(() => createWebAttachmentAdapter(), [])

  const uploadAttachments = useCallback(
    async (files: File[]) => {
      return await webAttachmentAdapter.upload(files, async () => {
        const uploadUrl = await generateAttachmentUploadUrl({})
        return uploadUrl
      })
    },
    [generateAttachmentUploadUrl, webAttachmentAdapter],
  )

  const resumeMessageStreaming = useCallback((threadId?: string) => {
    dispatchChatEvent(CHAT_STREAM_RESUME_EVENT, { threadId })
  }, [])

  const followLatestMessage = useCallback((threadId?: string) => {
    dispatchChatEvent(CHAT_FOLLOW_LATEST_EVENT, { threadId })
  }, [])

  const resolveAutoModelDecision = useCallback(
    async ({
      text,
      threadId,
      searchEnabled,
      reasoning,
      requiresImageInput,
      attachmentSummary,
      allowedModelDocIds,
    }: {
      text: string
      threadId?: string
      searchEnabled?: boolean
      reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
      requiresImageInput?: boolean
      attachmentSummary?: {
        imageCount: number
        fileCount: number
        totalCount: number
      }
      allowedModelDocIds?: Id<'models'>[]
    }) => {
      const payloadBase = {
        prompt: text,
        threadId,
        searchEnabled,
        reasoningEnabled: reasoning?.enabled === true,
        requiresImageInput: requiresImageInput === true,
        attachmentSummary,
      }
      let routed: { decisionId?: string; selectedModelDocId: Id<'models'> }
      if (allowedModelDocIds && allowedModelDocIds.length > 0) {
        try {
          routed = (await selectAutoModel({
            ...payloadBase,
            allowedModelDocIds,
          } as never)) as {
            decisionId?: string
            selectedModelDocId: Id<'models'>
          }
        } catch (error) {
          if (!isExtraFieldValidationError(error, 'allowedModelDocIds')) {
            throw error
          }
          routed = (await selectAutoModel(payloadBase as never)) as {
            decisionId?: string
            selectedModelDocId: Id<'models'>
          }
        }
      } else {
        routed = (await selectAutoModel(payloadBase as never)) as {
          decisionId?: string
          selectedModelDocId: Id<'models'>
        }
      }

      return {
        decisionId: routed.decisionId,
        modelDocId: routed.selectedModelDocId,
      }
    },
    [selectAutoModel],
  )

  const resolveAutoModelDecisionForPromptMessage = useCallback(
    async ({
      threadId,
      promptMessageId,
      searchEnabled,
      reasoning,
      allowedModelDocIds,
    }: {
      threadId: string
      promptMessageId: string
      searchEnabled?: boolean
      reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
      allowedModelDocIds?: Id<'models'>[]
    }) => {
      const payloadBase = {
        threadId,
        promptMessageId,
        searchEnabled,
        reasoningEnabled: reasoning?.enabled === true,
      }

      let routed: { decisionId?: string; selectedModelDocId: Id<'models'> }
      if (allowedModelDocIds && allowedModelDocIds.length > 0) {
        try {
          routed = (await selectAutoModelForPromptMessage({
            ...payloadBase,
            allowedModelDocIds,
          } as never)) as {
            decisionId?: string
            selectedModelDocId: Id<'models'>
          }
        } catch (error) {
          if (!isExtraFieldValidationError(error, 'allowedModelDocIds')) {
            throw error
          }
          routed = (await selectAutoModelForPromptMessage(payloadBase as never)) as {
            decisionId?: string
            selectedModelDocId: Id<'models'>
          }
        }
      } else {
        routed = (await selectAutoModelForPromptMessage(payloadBase as never)) as {
          decisionId?: string
          selectedModelDocId: Id<'models'>
        }
      }

      return {
        decisionId: routed.decisionId,
        modelDocId: routed.selectedModelDocId,
      }
    },
    [selectAutoModelForPromptMessage],
  )

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      autoModelAllowedModelDocIds,
      selectionTier: _selectionTier,
      projectId,
      contextArtifactIds,
      searchEnabled,
      searchMode,
      reasoning,
      attachments,
      onThreadReady,
      onBeforeGenerate,
      onError,
      onSettled,
    }: {
      text: string
      threadId?: string
      modelDocId?: Id<'models'>
      autoModelAllowedModelDocIds?: Id<'models'>[]
      selectionTier?: 'free' | 'pro' | 'advanced'
      projectId?: Id<'projects'>
      contextArtifactIds?: Id<'projectArtifacts'>[]
      searchEnabled?: boolean
      searchMode?: 'auto' | 'required'
      reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
      attachments?: File[]
      onThreadReady?: (threadId: string) => void | Promise<void>
      onBeforeGenerate?: () => void | Promise<void>
      onError?: (error: Error) => void | Promise<void>
      onSettled?: () => void | Promise<void>
    }) => {
      let resolvedThreadId = threadId

      try {
        if (!isOnline) {
          return { threadId, disabledReason: 'offline' as const }
        }

        let nextThreadId = threadId
        const clientThreadKey = threadId ?? createClientThreadKey()
        if (!nextThreadId) {
          const title = text.substring(0, 30) || attachments?.[0]?.name || 'New chat'
          if (supportsClientThreadKeyRef.current) {
            try {
              nextThreadId = await createThread({
                title,
                projectId,
                clientThreadKey,
              } as never)
            } catch (error) {
              if (!isExtraFieldValidationError(error, 'clientThreadKey')) {
                throw error
              }
              supportsClientThreadKeyRef.current = false
              nextThreadId = await createThread({
                title,
                projectId,
              } as never)
            }
          } else {
            nextThreadId = await createThread({
              title,
              projectId,
            } as never)
          }
        }
        resolvedThreadId = nextThreadId
        if (!resolvedThreadId) {
          throw new Error('Failed to create a chat thread')
        }

        await onThreadReady?.(resolvedThreadId)
        followLatestMessage(resolvedThreadId)
        resumeMessageStreaming(resolvedThreadId)

        let routerDecisionId: string | undefined
        let resolvedModelDocId = modelDocId
        if (!resolvedModelDocId) {
          const attachmentSummary = buildAttachmentSummary(attachments)
          const routed = await resolveAutoModelDecision({
            text,
            threadId: resolvedThreadId,
            searchEnabled,
            reasoning,
            requiresImageInput: (attachmentSummary?.imageCount ?? 0) > 0,
            attachmentSummary,
            allowedModelDocIds: autoModelAllowedModelDocIds,
          })
          resolvedModelDocId = routed.modelDocId
          routerDecisionId = routed.decisionId
        }
        if (!resolvedModelDocId) {
          throw new Error('No model selected')
        }

        const hasAttachments = Boolean(attachments && attachments.length > 0)
        if (!text.trim() && !hasAttachments) {
          throw new Error('Message cannot be empty')
        }

        const uploadedAttachments =
          attachments && attachments.length > 0 ? await uploadAttachments(attachments) : undefined

        await onBeforeGenerate?.()
        const resolvedSearchMode = searchEnabled === true ? (searchMode ?? 'required') : undefined
        const sendPayload = {
          threadId: resolvedThreadId,
          prompt: text,
          modelId: resolvedModelDocId,
          ...(routerDecisionId ? { routerDecisionId } : {}),
          projectId,
          contextArtifactIds,
          searchEnabled: searchEnabled ?? false,
          ...(resolvedSearchMode ? { searchMode: resolvedSearchMode } : {}),
          reasoning,
          attachments: uploadedAttachments,
        }
        const initialClientRequestId = supportsClientRequestIdRef.current
          ? createClientRequestId()
          : undefined
        const executeSendMutation = async (
          payload: Record<string, unknown>,
          clientRequestId?: string,
        ) => {
          if (clientRequestId) {
            try {
              await sendMessage({
                ...payload,
                clientRequestId,
              } as never)
              return
            } catch (error) {
              if (!isExtraFieldValidationError(error, 'clientRequestId')) {
                throw error
              }
              supportsClientRequestIdRef.current = false
            }
          }

          await sendMessage(payload as never)
        }

        const payloadWithCompat = supportsSearchModeRef.current
          ? sendPayload
          : (({ searchMode: _searchMode, ...rest }) => rest)(sendPayload)

        try {
          await executeSendMutation(payloadWithCompat, initialClientRequestId)
        } catch (error) {
          if (!supportsSearchModeRef.current || !isExtraFieldValidationError(error, 'searchMode')) {
            throw error
          }
          supportsSearchModeRef.current = false
          const payloadWithoutSearchMode = (({ searchMode: _searchMode, ...rest }) => rest)(
            sendPayload,
          )
          await executeSendMutation(payloadWithoutSearchMode, initialClientRequestId)
        }

        writeDraft(threadId || 'new', '')
        writeDraft(resolvedThreadId, '')

        return { threadId: resolvedThreadId, disabledReason: null }
      } catch (error) {
        const resolvedError = error instanceof Error ? error : new Error('Failed to send message')
        if (resolvedThreadId) {
          writeDraft(resolvedThreadId, text)
        }
        await onError?.(resolvedError)
        throw resolvedError
      } finally {
        await onSettled?.()
      }
    },
    [
      createThread,
      followLatestMessage,
      isOnline,
      resolveAutoModelDecision,
      resumeMessageStreaming,
      sendMessage,
      uploadAttachments,
    ],
  )

  return {
    send,
    stop: useCallback(
      async ({ threadId, promptMessageId }: { threadId: string; promptMessageId?: string }) => {
        if (!isOnline) {
          return { disabledReason: 'offline' as const, stopped: false }
        }

        const result = (await stopGeneration({
          threadId,
          promptMessageId,
        } as never)) as { stopped?: boolean } | null
        resumeMessageStreaming(threadId)

        return {
          disabledReason: null,
          stopped: Boolean(result?.stopped),
        }
      },
      [isOnline, resumeMessageStreaming, stopGeneration],
    ),
    regenerate: useCallback(
      async ({
        threadId,
        promptMessageId,
        modelDocId,
        autoModelAllowedModelDocIds,
        selectionTier: _selectionTier,
        projectId,
        contextArtifactIds,
        searchEnabled,
        searchMode,
        reasoning,
      }: {
        threadId: string
        promptMessageId: string
        modelDocId?: Id<'models'>
        autoModelAllowedModelDocIds?: Id<'models'>[]
        selectionTier?: 'free' | 'pro' | 'advanced'
        projectId?: Id<'projects'>
        contextArtifactIds?: Id<'projectArtifacts'>[]
        searchEnabled?: boolean
        searchMode?: 'auto' | 'required'
        reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
      }) => {
        if (!isOnline) {
          return { disabledReason: 'offline' as const }
        }

        let routerDecisionId: string | undefined
        let resolvedModelDocId = modelDocId
        if (!resolvedModelDocId) {
          const routed = await resolveAutoModelDecisionForPromptMessage({
            threadId,
            promptMessageId,
            searchEnabled,
            reasoning,
            allowedModelDocIds: autoModelAllowedModelDocIds,
          })
          resolvedModelDocId = routed.modelDocId
          routerDecisionId = routed.decisionId
        }
        if (!resolvedModelDocId) {
          throw new Error('No model selected')
        }

        const resolvedSearchMode = searchEnabled === true ? (searchMode ?? 'required') : undefined
        const regeneratePayload = {
          threadId,
          promptMessageId,
          modelId: resolvedModelDocId,
          ...(routerDecisionId ? { routerDecisionId } : {}),
          projectId,
          contextArtifactIds,
          searchEnabled: searchEnabled ?? false,
          ...(resolvedSearchMode ? { searchMode: resolvedSearchMode } : {}),
          reasoning,
        }
        const executeRegenerateMutation = async (payload: Record<string, unknown>) => {
          if (supportsClientRequestIdRef.current) {
            try {
              await regenerateMessage({
                ...payload,
                clientRequestId: createClientRequestId(),
              } as never)
              return
            } catch (error) {
              if (!isExtraFieldValidationError(error, 'clientRequestId')) {
                throw error
              }
              supportsClientRequestIdRef.current = false
            }
          }

          await regenerateMessage(payload as never)
        }

        const payloadWithCompat = supportsSearchModeRef.current
          ? regeneratePayload
          : (({ searchMode: _searchMode, ...rest }) => rest)(regeneratePayload)

        try {
          await executeRegenerateMutation(payloadWithCompat)
        } catch (error) {
          if (!supportsSearchModeRef.current || !isExtraFieldValidationError(error, 'searchMode')) {
            throw error
          }
          supportsSearchModeRef.current = false
          const payloadWithoutSearchMode = (({ searchMode: _searchMode, ...rest }) => rest)(
            regeneratePayload,
          )
          await executeRegenerateMutation(payloadWithoutSearchMode)
        }
        resumeMessageStreaming(threadId)

        return { disabledReason: null }
      },
      [
        isOnline,
        regenerateMessage,
        resolveAutoModelDecisionForPromptMessage,
        resumeMessageStreaming,
      ],
    ),
    disabledReason: isOnline ? null : 'offline',
  }
}
