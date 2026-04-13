import { useUIMessages } from '@convex-dev/agent/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ChatRenderableAttachment, ChatRenderableMessage } from '../components/chat/types'
import { api } from '../lib/convexApi'
import { cacheMessages, readMessages } from '../offline/cache'
import type { MobileOfflineMessageRecord } from '../offline/types'
import { isLocalThreadId } from './local-thread-id'
import {
  selectRenderableForThread,
  useChatOptimisticSendStore,
} from '../store/chat-optimistic-send'

function normalizeMessageAttachments(parts: unknown): ChatRenderableAttachment[] {
  if (!Array.isArray(parts)) {
    return []
  }

  return parts.flatMap((part) => {
    if (!part || typeof part !== 'object') {
      return []
    }

    const candidate = part as {
      type?: string
      url?: unknown
      mediaType?: unknown
      filename?: unknown
    }
    if (candidate.type !== 'file' || typeof candidate.url !== 'string') {
      return []
    }

    const mediaType =
      typeof candidate.mediaType === 'string' && candidate.mediaType.length > 0
        ? candidate.mediaType
        : 'application/octet-stream'

    return [
      {
        kind: mediaType.startsWith('image/') ? 'image' : 'file',
        url: candidate.url,
        mediaType,
        filename: typeof candidate.filename === 'string' ? candidate.filename : undefined,
      } satisfies ChatRenderableAttachment,
    ]
  })
}

function normalizeMessage(
  message: any,
  threadId: string,
  index: number,
): MobileOfflineMessageRecord & ChatRenderableMessage {
  return {
    id: message.id,
    threadId,
    role: message.role,
    text: message.text,
    attachments: normalizeMessageAttachments(message.parts),
    status: message.status,
    createdAt: message.order ?? index,
    order: message.order,
  }
}

function getMessageSortValue(message: Pick<ChatRenderableMessage, 'order' | 'createdAt'>) {
  if (typeof message.order === 'number') {
    return message.order
  }
  if (typeof message.createdAt === 'number') {
    return message.createdAt
  }
  return Number.POSITIVE_INFINITY
}

function sortMessages<T extends ChatRenderableMessage>(messages: T[]) {
  return messages
    .slice()
    .sort(
      (left, right) =>
        getMessageSortValue(left) - getMessageSortValue(right) || left.id.localeCompare(right.id),
    )
}

export function useMessages(threadId?: string) {
  const hasLocalThreadId = isLocalThreadId(threadId)
  const queryArgs = threadId && !hasLocalThreadId ? { threadId } : 'skip'
  const { results, status } = useUIMessages(api.chat.listMessages as never, queryArgs as never, {
    initialNumItems: 30,
  })
  const clearDeliveredForThread = useChatOptimisticSendStore(
    (state) => state.clearDeliveredForThread,
  )
  const [cachedMessages, setCachedMessages] = useState<MobileOfflineMessageRecord[]>([])
  const lastLiveSnapshotRef = useRef('')

  const liveMessages = useMemo(
    () =>
      threadId && !hasLocalThreadId && results?.length
        ? sortMessages(
            results.map((message: any, index: number) =>
              normalizeMessage(message, threadId, index),
            ),
          )
        : [],
    [hasLocalThreadId, results, threadId],
  )
  const localMessages = useChatOptimisticSendStore(
    useShallow((state) => selectRenderableForThread(state, threadId, liveMessages)),
  )

  useEffect(() => {
    if (!threadId || hasLocalThreadId) {
      lastLiveSnapshotRef.current = ''
      return
    }
    void readMessages(threadId).then(setCachedMessages)
  }, [hasLocalThreadId, threadId])

  useEffect(() => {
    if (!threadId || hasLocalThreadId || !results?.length) return
    const snapshotSignature = liveMessages
      .map((message) =>
        [
          message.id,
          message.role,
          message.status ?? '',
          message.createdAt ?? '',
          message.text.length,
          message.attachments?.map((attachment) => attachment.url).join(',') ?? '',
        ].join(':'),
      )
      .join('|')
    if (snapshotSignature === lastLiveSnapshotRef.current) {
      return
    }
    lastLiveSnapshotRef.current = snapshotSignature
    setCachedMessages(liveMessages)
    void cacheMessages(threadId, liveMessages)
  }, [hasLocalThreadId, liveMessages, results, threadId])

  useEffect(() => {
    if (!threadId || liveMessages.length === 0) {
      return
    }
    clearDeliveredForThread(threadId, liveMessages)
  }, [clearDeliveredForThread, liveMessages, threadId])

  const persistedMessages = liveMessages.length ? liveMessages : cachedMessages
  const mergedMessages = useMemo(
    () => sortMessages([...localMessages, ...persistedMessages]),
    [localMessages, persistedMessages],
  )

  return {
    status,
    messages: mergedMessages,
  }
}
