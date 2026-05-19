import { useUIMessages } from '@convex-dev/agent/react'
import type { UsePaginatedQueryResult } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import {
  useGenerationState as useChatCoreGenerationState,
  useThreadMessages,
} from '@chat/chat-core'
import { CHAT_STREAM_RESUME_EVENT } from '@/lib/chat-events'
import { sortChatMessages } from '@/hooks/chat-data/message-order'
import { readMessagesCache } from '@/offline/local-cache'
import {
  cacheMessagesToLocal,
  type ChatMessage,
  type LocalCachedMessageRow,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

type UseMessagesResult = {
  messages: ChatMessage[]
  status: UsePaginatedQueryResult<ChatMessage>['status']
  hasMore: boolean
  isLoadingMore: boolean
  hasRenderableMessages: boolean
  loadOlderMessages: (numItems: number) => void
}

export function useMessages(threadId?: string): UseMessagesResult {
  const cacheUserId = useConvexUserIdForCache()
  const cacheVersion = useOfflineCacheVersion()
  const [streamEnabled, setStreamEnabled] = useState(Boolean(threadId))
  const stableSignatureRef = useRef('')
  const stableSnapshotCountRef = useRef(0)
  const queryArgs = threadId ? { threadId } : 'skip'
  const paginatedMessages = useUIMessages(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
    stream: streamEnabled,
  }) as unknown as UsePaginatedQueryResult<ChatMessage>
  const { results, status, loadMore } = paginatedMessages

  const cachedMessages = useMemo(() => {
    if (!threadId || !cacheUserId) {
      return [] as ChatMessage[]
    }
    const raw = readMessagesCache<LocalCachedMessageRow[]>(cacheUserId, threadId)
    if (!Array.isArray(raw)) {
      return [] as ChatMessage[]
    }
    return raw.map(
      (message) =>
        ({
          id: message.id,
          role: message.role,
          text: message.text,
          parts: message.parts,
          createdAt: message.createdAt,
          failureKind: message.failureKind,
          failureMode: message.failureMode,
          failureNote: message.failureNote,
          status:
            message.status === 'streaming'
              ? 'streaming'
              : message.status === 'failed'
                ? 'failed'
                : 'success',
        }) as ChatMessage,
    )
  }, [threadId, cacheUserId, cacheVersion])

  const liveResults = useMemo(() => {
    if (!threadId || results === undefined) {
      return undefined
    }
    return results.map((message) => ({
      ...message,
      createdAt: message.order,
    })) as ChatMessage[]
  }, [results, threadId])

  const { messages, hasMore, isLoadingMore, hasRenderableMessages, loadOlderMessages } =
    useThreadMessages({
      threadId,
      threadKey: threadId ?? 'new',
      liveResults,
      persistedMessages: cachedMessages,
      paginatedStatus: status,
      loadMore,
    })

  const liveMessages = useMemo(
    () => (threadId && results?.length ? sortChatMessages(liveResults ?? []) : []),
    [liveResults, results?.length, threadId],
  )

  const pendingCacheWriteRef = useRef<number | null>(null)
  const lastCachedSignatureRef = useRef('')
  const hasStreamingMessages = useMemo(
    () =>
      Boolean(
        liveMessages.some(
          (message) => message.status === 'streaming' || message.status === 'pending',
        ),
      ),
    [liveMessages],
  )
  const cacheSignature = useMemo(() => {
    if (!threadId || liveMessages.length === 0) {
      return ''
    }

    const lastMessage = liveMessages[liveMessages.length - 1] as {
      id?: string
      status?: string
      text?: string
    }
    return [
      threadId,
      liveMessages.length,
      lastMessage?.id || '',
      lastMessage?.status || '',
      lastMessage?.text?.length || 0,
      hasStreamingMessages ? 1 : 0,
    ].join(':')
  }, [hasStreamingMessages, liveMessages, threadId])

  useEffect(() => {
    return () => {
      if (pendingCacheWriteRef.current !== null) {
        window.clearTimeout(pendingCacheWriteRef.current)
      }
    }
  }, [])

  useEffect(() => {
    lastCachedSignatureRef.current = ''
    stableSignatureRef.current = ''
    stableSnapshotCountRef.current = 0
    setStreamEnabled(Boolean(threadId))

    if (pendingCacheWriteRef.current !== null) {
      window.clearTimeout(pendingCacheWriteRef.current)
      pendingCacheWriteRef.current = null
    }
  }, [threadId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleResume = (event: Event) => {
      const customEvent = event as CustomEvent<{ threadId?: string }>
      if (!threadId || !customEvent.detail?.threadId) {
        return
      }
      if (customEvent.detail.threadId === threadId) {
        stableSignatureRef.current = ''
        stableSnapshotCountRef.current = 0
        setStreamEnabled(true)
      }
    }
    window.addEventListener(CHAT_STREAM_RESUME_EVENT, handleResume)
    return () => window.removeEventListener(CHAT_STREAM_RESUME_EVENT, handleResume)
  }, [threadId])

  useEffect(() => {
    if (!threadId || !cacheSignature) {
      return
    }

    if (hasStreamingMessages) {
      stableSignatureRef.current = cacheSignature
      stableSnapshotCountRef.current = 0
      if (!streamEnabled) {
        setStreamEnabled(true)
      }
      return
    }

    if (stableSignatureRef.current === cacheSignature) {
      stableSnapshotCountRef.current += 1
      if (stableSnapshotCountRef.current >= 1 && streamEnabled) {
        setStreamEnabled(false)
      }
      return
    }

    stableSignatureRef.current = cacheSignature
    stableSnapshotCountRef.current = 0
  }, [cacheSignature, hasStreamingMessages, streamEnabled, threadId])

  useEffect(() => {
    if (!threadId || !cacheUserId || liveMessages.length === 0 || !cacheSignature) {
      return
    }

    if (cacheSignature === lastCachedSignatureRef.current) {
      return
    }

    if (pendingCacheWriteRef.current !== null) {
      window.clearTimeout(pendingCacheWriteRef.current)
    }

    const writeDelayMs = hasStreamingMessages ? 1200 : 180
    pendingCacheWriteRef.current = window.setTimeout(() => {
      const snapshot = liveMessages
      try {
        cacheMessagesToLocal(cacheUserId, threadId, snapshot)
        lastCachedSignatureRef.current = cacheSignature
      } catch {
        // Ignore caching failures; live data path remains authoritative.
      }
      pendingCacheWriteRef.current = null
    }, writeDelayMs)

    return () => {
      if (pendingCacheWriteRef.current !== null) {
        window.clearTimeout(pendingCacheWriteRef.current)
        pendingCacheWriteRef.current = null
      }
    }
  }, [cacheSignature, cacheUserId, hasStreamingMessages, liveMessages, threadId])

  return {
    messages,
    status,
    hasMore,
    isLoadingMore,
    hasRenderableMessages,
    loadOlderMessages,
  }
}

export function useGenerationState(messages: ChatMessage[]) {
  return useChatCoreGenerationState(messages)
}
