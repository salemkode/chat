import type { FunctionReturnType } from 'convex/server'
import type { Value } from 'convex/values'
import { insertAtPosition, useAction, useMutation } from 'convex/react'
import { useCallback, useRef } from 'react'
import { createClientRequestId, createClientThreadKey } from '@chat/shared/logic/client-keys'
import { api, type Id } from '../lib/convexApi'
import { writeDraft } from '../offline/cache'
import { useNetworkStatus } from '../utils/network-status'
import {
  pickDocumentAttachments as pickDocuments,
  pickImageAttachments as pickImages,
  uriToBlob,
  type LocalAsset,
} from './attachments'
import { isLocalThreadId } from './local-thread-id'
import { toModelId, toProjectId } from './normalize'
import { type ThreadsWithMetadata, withOptimisticThreads } from './optimistic'

type ListMessagesPageItem = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

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
  attachments: LocalAsset[],
): { imageCount: number; fileCount: number; totalCount: number } | undefined {
  if (attachments.length === 0) {
    return undefined
  }

  let imageCount = 0
  let fileCount = 0
  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith('image/')) {
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

export function useSendMessage() {
  const { isOnline } = useNetworkStatus()
  const supportsClientThreadKeyRef = useRef(true)
  const supportsClientRequestIdRef = useRef(true)
  const supportsSearchModeRef = useRef(true)
  const selectAutoModel = useAction(
    (
      api as typeof api & {
        modelRouter: {
          selectAutoModel: unknown
          selectAutoModelForPromptMessage: unknown
        }
      }
    ).modelRouter.selectAutoModel as never,
  )
  const selectAutoModelForPromptMessage = useAction(
    (
      api as typeof api & {
        modelRouter: {
          selectAutoModel: unknown
          selectAutoModelForPromptMessage: unknown
        }
      }
    ).modelRouter.selectAutoModelForPromptMessage as never,
  )
  const createThreadMutation = useMutation(api.agents.createChatThread).withOptimisticUpdate(
    (
      localStore,
      args: { title?: string; projectId?: Id<'projects'>; clientThreadKey?: string },
    ) => {
      const now = Date.now()
      withOptimisticThreads(localStore, (threads) => {
        const row: ThreadsWithMetadata[number] = {
          _id: `optimistic-thread-${args.clientThreadKey || now}`,
          _creationTime: now,
          lastMessageAt: now,
          title: args.title || 'New chat',
          metadata: null,
          project: args.projectId
            ? {
                id: args.projectId,
                name: 'Project',
              }
            : null,
        }
        return [row, ...threads]
      })
    },
  )
  const generateMessageMutation = useMutation(
    api.agents.generateMessage as never,
  ).withOptimisticUpdate(
    (localStore, args: { threadId: string; prompt: string; clientRequestId?: string }) => {
      const now = Date.now()
      const { threadId, prompt, clientRequestId } = args
      const idSuffix = clientRequestId?.trim() || now
      const queries = localStore.getAllQueries(api.chat.listMessages)
      let maxOrder = -1
      for (const query of queries) {
        if (query.args.threadId !== threadId || query.args.streamArgs) {
          continue
        }
        for (const message of query.value?.page ?? []) {
          maxOrder = Math.max(maxOrder, message.order)
        }
      }
      const order = maxOrder + 1
      const sortKeyFromItem = (el: ListMessagesPageItem): Value | Value[] => [
        el.order,
        el.stepOrder,
      ]
      const assistant: ListMessagesPageItem = {
        id: `optimistic-assistant-${idSuffix}`,
        role: 'assistant',
        key: `${threadId}-${order}-1`,
        text: '',
        order,
        stepOrder: 1,
        status: 'streaming',
        _creationTime: now,
        parts: [],
      }
      const user: ListMessagesPageItem = {
        id: `optimistic-user-${idSuffix}`,
        role: 'user',
        key: `${threadId}-${order}-0`,
        text: prompt,
        order,
        stepOrder: 0,
        status: 'success',
        _creationTime: now,
        parts: [{ type: 'text', text: prompt, state: 'done' }],
      }
      insertAtPosition({
        localQueryStore: localStore,
        paginatedQuery: api.chat.listMessages,
        argsToMatch: { threadId },
        sortOrder: 'desc',
        sortKeyFromItem,
        item: assistant,
      })
      insertAtPosition({
        localQueryStore: localStore,
        paginatedQuery: api.chat.listMessages,
        argsToMatch: { threadId },
        sortOrder: 'desc',
        sortKeyFromItem,
        item: user,
      })
    },
  )
  const regenerateMessageMutation = useMutation(
    api.agents.regenerateMessage as never,
  ).withOptimisticUpdate((localStore, args: { threadId: string }) => {
    const now = Date.now()
    const { threadId } = args
    const queries = localStore.getAllQueries(api.chat.listMessages)
    const first = queries.find(
      (q) =>
        q.args.threadId === threadId &&
        q.args.paginationOpts?.cursor === null &&
        q.value?.page?.length,
    )
    const topOrder = first?.value?.page[0]?.order ?? now
    const order = topOrder + 1
    const item: ListMessagesPageItem = {
      id: `optimistic-regenerate-${now}`,
      role: 'assistant',
      key: `${threadId}-${order}-0`,
      text: '',
      order,
      stepOrder: 0,
      status: 'streaming',
      _creationTime: now,
      parts: [],
    }
    insertAtPosition({
      localQueryStore: localStore,
      paginatedQuery: api.chat.listMessages,
      argsToMatch: { threadId },
      sortOrder: 'desc',
      sortKeyFromItem: (el) => [el.order, el.stepOrder] as Value | Value[],
      item,
    })
  })
  const generateUploadUrlMutation = useMutation(api.agents.generateAttachmentUploadUrl)

  const createThread = useCallback(
    async (title?: string, projectId?: string, clientThreadKey?: string) => {
      if (!isOnline) {
        return undefined
      }
      const baseArgs = {
        title,
        projectId: toProjectId(projectId),
      }

      if (!supportsClientThreadKeyRef.current || !clientThreadKey) {
        return await createThreadMutation(baseArgs as never)
      }

      try {
        return await createThreadMutation({
          ...baseArgs,
          clientThreadKey,
        } as never)
      } catch (error) {
        if (!isExtraFieldValidationError(error, 'clientThreadKey')) {
          throw error
        }
        supportsClientThreadKeyRef.current = false
        return await createThreadMutation(baseArgs as never)
      }
    },
    [createThreadMutation, isOnline],
  )

  const createThreadWithDraft = useCallback(
    async ({
      title,
      projectId,
      initialDraft,
    }: {
      title?: string
      projectId?: string
      initialDraft?: string
    }) => {
      const threadId = await createThread(title, projectId)
      if (!threadId) {
        return null
      }

      const normalizedDraft = initialDraft?.trim()
      if (normalizedDraft) {
        await writeDraft(threadId, normalizedDraft)
      }

      return threadId
    },
    [createThread],
  )

  const send = useCallback(
    async ({
      threadId,
      prompt,
      modelDocId,
      projectId,
      searchEnabled,
      searchMode,
      attachments,
      onThreadResolved,
      onBeforeGenerate,
    }: {
      threadId?: string
      prompt: string
      modelDocId?: string
      projectId?: string
      searchEnabled: boolean
      searchMode?: 'auto' | 'required'
      attachments: LocalAsset[]
      onThreadResolved?: (threadId: string) => Promise<void> | void
      onBeforeGenerate?: () => Promise<void> | void
    }) => {
      if (!isOnline) {
        return { threadId: threadId ?? null, disabledReason: 'offline' as const }
      }
      const hasAttachments = attachments.length > 0
      if (!prompt.trim() && !hasAttachments) {
        throw new Error('Message cannot be empty')
      }

      const clientThreadKey = threadId && isLocalThreadId(threadId) ? threadId : undefined
      const normalizedThreadId = threadId && !isLocalThreadId(threadId) ? threadId : undefined
      let resolvedThreadId = normalizedThreadId
      if (!resolvedThreadId) {
        resolvedThreadId = await createThread(
          prompt.trim().split('\n')[0]?.slice(0, 60) || 'New chat',
          projectId,
          clientThreadKey || createClientThreadKey(),
        )
        if (resolvedThreadId) {
          await onThreadResolved?.(resolvedThreadId)
        }
      }
      if (!resolvedThreadId) {
        throw new Error('Failed to create thread')
      }

      let routerDecisionId: string | undefined
      let resolvedModelDocId = modelDocId
      if (!resolvedModelDocId) {
        const attachmentSummary = buildAttachmentSummary(attachments)
        const routed = (await selectAutoModel({
          prompt,
          threadId: resolvedThreadId,
          searchEnabled,
          reasoningEnabled: false,
          requiresImageInput: (attachmentSummary?.imageCount ?? 0) > 0,
          attachmentSummary,
        } as never)) as { decisionId?: string; selectedModelDocId: string }
        resolvedModelDocId = routed.selectedModelDocId
        routerDecisionId = routed.decisionId
      }
      if (!resolvedModelDocId) {
        throw new Error('No model selected')
      }

      const uploaded = []
      for (const attachment of attachments) {
        const uploadUrl = await generateUploadUrlMutation({})
        const blob = await uriToBlob(attachment.uri)
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': attachment.mimeType,
          },
          body: blob,
        })
        if (!response.ok) {
          throw new Error(`Failed to upload ${attachment.name}`)
        }
        const payload = (await response.json()) as { storageId: string }
        uploaded.push({
          storageId: payload.storageId as Id<'_storage'>,
          filename: attachment.name,
          mediaType: attachment.mimeType,
        })
      }

      await onBeforeGenerate?.()
      const resolvedSearchMode = searchEnabled ? (searchMode ?? 'required') : undefined
      const sendPayload = {
        threadId: resolvedThreadId,
        prompt,
        modelId: toModelId(resolvedModelDocId),
        ...(routerDecisionId ? { routerDecisionId } : {}),
        projectId: toProjectId(projectId),
        searchEnabled,
        ...(resolvedSearchMode ? { searchMode: resolvedSearchMode } : {}),
        attachments: uploaded,
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
            await generateMessageMutation({
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
        await generateMessageMutation(payload as never)
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
      await writeDraft(resolvedThreadId, '')
      await writeDraft('new', '')
      return { threadId: resolvedThreadId, disabledReason: null }
    },
    [createThread, generateMessageMutation, generateUploadUrlMutation, isOnline, selectAutoModel],
  )

  const resolveAutoModelDecisionForPromptMessage = useCallback(
    async ({
      threadId,
      promptMessageId,
      searchEnabled,
    }: {
      threadId: string
      promptMessageId: string
      searchEnabled: boolean
    }) => {
      const routed = (await selectAutoModelForPromptMessage({
        threadId,
        promptMessageId,
        searchEnabled,
        reasoningEnabled: false,
      } as never)) as { decisionId?: string; selectedModelDocId: string }
      return {
        decisionId: routed.decisionId,
        modelDocId: routed.selectedModelDocId,
      }
    },
    [selectAutoModelForPromptMessage],
  )

  return {
    createThread,
    createThreadWithDraft,
    send,
    regenerate: useCallback(
      async ({
        threadId,
        promptMessageId,
        modelDocId,
        projectId,
        searchEnabled,
        searchMode,
      }: {
        threadId: string
        promptMessageId: string
        modelDocId?: string
        projectId?: string
        searchEnabled: boolean
        searchMode?: 'auto' | 'required'
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
          })
          resolvedModelDocId = routed.modelDocId
          routerDecisionId = routed.decisionId
        }
        if (!resolvedModelDocId) {
          throw new Error('No model selected')
        }
        const resolvedSearchMode = searchEnabled ? (searchMode ?? 'required') : undefined
        const regeneratePayload = {
          threadId,
          promptMessageId,
          modelId: toModelId(resolvedModelDocId),
          ...(routerDecisionId ? { routerDecisionId } : {}),
          projectId: toProjectId(projectId),
          searchEnabled,
          ...(resolvedSearchMode ? { searchMode: resolvedSearchMode } : {}),
        }
        const executeRegenerateMutation = async (payload: Record<string, unknown>) => {
          if (supportsClientRequestIdRef.current) {
            try {
              await regenerateMessageMutation({
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
          await regenerateMessageMutation(payload as never)
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
        return { disabledReason: null }
      },
      [isOnline, regenerateMessageMutation, resolveAutoModelDecisionForPromptMessage],
    ),
    pickImageAttachments: useCallback(async () => pickImages(), []),
    pickDocumentAttachments: useCallback(async () => pickDocuments(), []),
    disabledReason: isOnline ? null : 'offline',
  }
}
