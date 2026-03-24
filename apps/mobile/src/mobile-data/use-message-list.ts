import { useUIMessages } from '@convex-dev/agent/react'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { ChatRenderableAttachment, ChatRenderableMessage } from '../components/chat/types'
import { api } from '../lib/convexApi'
import { cacheMessages, readMessages } from '../offline/cache'
import type { MobileOfflineMessageRecord } from '../offline/types'
import { isLocalThreadId } from './local-thread-id'
import { selectRenderableForThread, useChatOptimisticSendStore } from '../store/chat-optimistic-send'

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

export function useMessages(threadId?: string) {
  const hasLocalThreadId = isLocalThreadId(threadId)
  const queryArgs = threadId && !hasLocalThreadId ? { threadId } : 'skip'
  const { results, status } = useUIMessages(api.chat.listMessages as never, queryArgs as never, {
    initialNumItems: 30,
  })
  const localMessages = useChatOptimisticSendStore(
    useShallow((state) => selectRenderableForThread(state, threadId)),
  )
  const [cachedMessages, setCachedMessages] = useState<MobileOfflineMessageRecord[]>([])
  const lastLiveSnapshotRef = useRef('')

  useEffect(() => {
    if (!threadId || hasLocalThreadId) {
      lastLiveSnapshotRef.current = ''
      return
    }
    void readMessages(threadId).then(setCachedMessages)
  }, [hasLocalThreadId, threadId])

  useEffect(() => {
    if (!threadId || hasLocalThreadId || !results?.length) return
    const normalized = results.map((message: any, index: number) =>
      normalizeMessage(message, threadId, index),
    )
    const snapshotSignature = normalized
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
    setCachedMessages(normalized)
    void cacheMessages(threadId, normalized)
  }, [hasLocalThreadId, results, threadId])

  const liveMessages =
    threadId && !hasLocalThreadId && results?.length
      ? results.map((message: any, index: number) => normalizeMessage(message, threadId, index))
      : []

  const persistedMessages = liveMessages.length ? liveMessages : cachedMessages
  const mergedMessages = [...localMessages, ...persistedMessages].sort(
    (left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0),
  )

  return {
    status,
    messages: mergedMessages,
  }
}
