import { useCallback, useEffect, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@chat/shared/hooks/use-online-status'
import { parseUploadResponse } from '@/lib/parsers'
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
  const createThread = useMutation(api.agents.createChatThread)
  const selectModel = useMutation(api.modelSelection.selectModel)
  const generateAttachmentUploadUrl = useMutation(
    api.agents.generateAttachmentUploadUrl,
  )
  const sendMessage = useMutation(api.agents.generateMessage).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticGenerateMessage(
        localStore,
        args.threadId,
        args.prompt,
        args.attachments,
      )
    },
  )
  const regenerateMessage = useMutation(api.agents.regenerateMessage).withOptimisticUpdate(
    (localStore, args) => {
      applyOptimisticRegenerateMessage(localStore, args.threadId)
    },
  )
  const stopGenerationApi = (
    api as typeof api & {
      agents: {
        stopGeneration: unknown
      }
    }
  ).agents
  const stopGeneration = useMutation(stopGenerationApi.stopGeneration as never)

  const uploadAttachments = useCallback(
    async (files: File[]) => {
      return await Promise.all(
        files.map(async (file) => {
          const uploadUrl = await generateAttachmentUploadUrl({})
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': file.type,
            },
            body: file,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const payload = parseUploadResponse(await response.json())

          return {
            storageId: payload.storageId as Id<'_storage'>,
            filename: file.name,
            mediaType: file.type,
          }
        }),
      )
    },
    [generateAttachmentUploadUrl],
  )

  const resumeMessageStreaming = useCallback((threadId?: string) => {
    dispatchChatEvent(CHAT_STREAM_RESUME_EVENT, { threadId })
  }, [])

  const followLatestMessage = useCallback((threadId?: string) => {
    dispatchChatEvent(CHAT_FOLLOW_LATEST_EVENT, { threadId })
  }, [])

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      selectionTier,
      projectId,
      searchEnabled,
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
      selectionTier?: 'free' | 'pro' | 'advanced'
      projectId?: Id<'projects'>
      searchEnabled?: boolean
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
        if (!nextThreadId) {
          nextThreadId = await createThread({
            title: text.substring(0, 30) || attachments?.[0]?.name || 'New chat',
            projectId,
          } as never)
        }
        resolvedThreadId = nextThreadId
        if (!resolvedThreadId) {
          throw new Error('Failed to create a chat thread')
        }

        if (!threadId) {
          writeDraft(resolvedThreadId, text)
        }
        await onThreadReady?.(resolvedThreadId)
        followLatestMessage(resolvedThreadId)
        resumeMessageStreaming(resolvedThreadId)

        let resolvedModelDocId = modelDocId
        if (!resolvedModelDocId && selectionTier) {
          const selection = await selectModel({
            tier: selectionTier,
            threadId: resolvedThreadId,
            requestContext: {
              prompt: text,
              promptChars: text.length,
              requiresTools: searchEnabled === true,
              requiresReasoning: reasoning?.enabled === true,
              needsLongContext: text.length > 8000,
            },
            requiresTools: {
              enabled: searchEnabled === true,
            },
            requiresReasoning: {
              enabled: reasoning?.enabled === true,
              level: reasoning?.level,
            },
          } as never)
          resolvedModelDocId = selection.selectedModel.modelDocId as Id<'models'>
        }
        if (!resolvedModelDocId) {
          throw new Error('No model selected')
        }

        const hasAttachments = Boolean(attachments && attachments.length > 0)
        if (!text.trim() && !hasAttachments) {
          throw new Error('Message cannot be empty')
        }

        const uploadedAttachments =
          attachments && attachments.length > 0
            ? await uploadAttachments(attachments)
            : undefined

        await onBeforeGenerate?.()
        await sendMessage({
          threadId: resolvedThreadId,
          prompt: text,
          modelId: resolvedModelDocId,
          projectId,
          searchEnabled: searchEnabled ?? false,
          reasoning,
          attachments: uploadedAttachments,
        } as never)

        writeDraft(threadId || 'new', '')
        writeDraft(resolvedThreadId, '')

        return { threadId: resolvedThreadId, disabledReason: null }
      } catch (error) {
        const resolvedError =
          error instanceof Error ? error : new Error('Failed to send message')
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
      resumeMessageStreaming,
      selectModel,
      sendMessage,
      uploadAttachments,
    ],
  )

  return {
    send,
    stop: useCallback(
      async ({
        threadId,
        promptMessageId,
      }: {
        threadId: string
        promptMessageId?: string
      }) => {
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
        selectionTier,
        projectId,
        searchEnabled,
        reasoning,
      }: {
        threadId: string
        promptMessageId: string
        modelDocId?: Id<'models'>
        selectionTier?: 'free' | 'pro' | 'advanced'
        projectId?: Id<'projects'>
        searchEnabled?: boolean
        reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
      }) => {
        if (!isOnline) {
          return { disabledReason: 'offline' as const }
        }

        let resolvedModelDocId = modelDocId
        if (!resolvedModelDocId && selectionTier) {
          const selection = await selectModel({
            tier: selectionTier,
            threadId,
            requestContext: {
              requiresTools: searchEnabled === true,
              requiresReasoning: reasoning?.enabled === true,
            },
            requiresTools: {
              enabled: searchEnabled === true,
            },
            requiresReasoning: {
              enabled: reasoning?.enabled === true,
              level: reasoning?.level,
            },
          } as never)
          resolvedModelDocId = selection.selectedModel.modelDocId as Id<'models'>
        }

        if (!resolvedModelDocId) {
          throw new Error('No model selected')
        }

        await regenerateMessage({
          threadId,
          promptMessageId,
          modelId: resolvedModelDocId,
          projectId,
          searchEnabled: searchEnabled ?? false,
          reasoning,
        } as never)
        resumeMessageStreaming(threadId)

        return { disabledReason: null }
      },
      [isOnline, regenerateMessage, resumeMessageStreaming, selectModel],
    ),
    disabledReason: isOnline ? null : 'offline',
  }
}
