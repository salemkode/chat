import type { UsePaginatedQueryResult } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import { usePaginatedQuery, useQuery } from '@/lib/convex-query-cache'
import {
  buildMessageProgressSignature,
  getLatestActiveAssistant,
  isGenerationStalled,
} from '@/lib/chat-generation'
import { CHAT_STREAM_RESUME_EVENT } from '@/lib/chat-events'
import { usePendingSends } from '@/hooks/chat-data/pending-sends'
import { readMessagesCache } from '@/offline/local-cache'
import {
  cacheMessagesToLocal,
  type ChatMessage,
  type LocalCachedMessageRow,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

function getMessageKey(message: Pick<ChatMessage, 'order' | 'stepOrder' | 'id'>) {
  return `${message.order ?? message.id}:${message.stepOrder ?? 0}`
}

function mergeLiveMessages(baseMessages: ChatMessage[], streamingMessages: ChatMessage[]) {
  const byKey = new Map(baseMessages.map((message) => [getMessageKey(message), message]))

  for (const message of streamingMessages) {
    const key = getMessageKey(message)
    const existing = byKey.get(key)
    if (!existing || existing.status === 'pending' || existing.status === 'streaming') {
      byKey.set(key, message)
    }
  }

  return Array.from(byKey.values()).sort(
    (left, right) =>
      (left.order ?? 0) - (right.order ?? 0) ||
      (left.stepOrder ?? 0) - (right.stepOrder ?? 0) ||
      (left.createdAt ?? 0) - (right.createdAt ?? 0),
  )
}

export type UseMessagesResult = {
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
  const threadKey = threadId ?? 'new'
  const { selectPendingMessages } = usePendingSends()
  const [streamEnabled, setStreamEnabled] = useState(Boolean(threadId))
  const stableSignatureRef = useRef('')
  const stableSnapshotCountRef = useRef(0)
  const queryArgs = threadId ? { threadId } : 'skip'
  const paginatedMessages = usePaginatedQuery(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
  }) as unknown as UsePaginatedQueryResult<ChatMessage>
  const streamingMessages = useQuery(
    api.chat.listStreamingMessages,
    threadId && streamEnabled ? { threadId } : 'skip',
  )
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

  const liveMessages = useMemo(() => {
    const persisted =
      threadId && results?.length
        ? results.map((message) => ({
            ...message,
            createdAt: message.order,
          }))
        : []
    const streams =
      threadId && streamingMessages?.length
        ? streamingMessages.map((message: ChatMessage) => ({
            ...message,
            createdAt: message.order,
          }))
        : []
    return mergeLiveMessages(persisted, streams)
  }, [results, streamingMessages, threadId])

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

  const resolvedMessages = liveMessages.length > 0 ? liveMessages : cachedMessages
  const pendingMessages = useMemo(
    () => selectPendingMessages(threadKey, liveMessages),
    [liveMessages, selectPendingMessages, threadKey],
  )
  const mergedMessages = useMemo(
    () => [...resolvedMessages, ...pendingMessages],
    [pendingMessages, resolvedMessages],
  )

  return {
    messages: mergedMessages,
    status,
    hasMore: status === 'CanLoadMore' || status === 'LoadingMore',
    isLoadingMore: status === 'LoadingMore',
    hasRenderableMessages: mergedMessages.length > 0,
    loadOlderMessages: loadMore,
  }
}

export function useGenerationState(messages: ChatMessage[]) {
  const activeGeneration = useMemo(() => getLatestActiveAssistant(messages), [messages])
  const activeMessage = activeGeneration?.message
  const activeSignature = useMemo(
    () => (activeMessage ? buildMessageProgressSignature(activeMessage) : null),
    [activeMessage],
  )
  const [lastProgressAt, setLastProgressAt] = useState(() => Date.now())
  const [tick, setTick] = useState(() => Date.now())
  const activeMessageIdRef = useRef<string | null>(null)
  const activeSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeMessage || !activeSignature) {
      activeMessageIdRef.current = null
      activeSignatureRef.current = null
      return
    }

    if (activeMessageIdRef.current !== activeMessage.id) {
      activeMessageIdRef.current = activeMessage.id
      activeSignatureRef.current = activeSignature
      setLastProgressAt(Date.now())
      return
    }

    if (activeSignatureRef.current !== activeSignature) {
      activeSignatureRef.current = activeSignature
      setLastProgressAt(Date.now())
    }
  }, [activeMessage, activeSignature])

  useEffect(() => {
    if (!activeMessage) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeMessage])

  const isStalled = Boolean(
    activeMessage &&
    isGenerationStalled({
      lastProgressAt,
      now: tick,
    }),
  )

  return {
    activeGeneration,
    isStalled,
  }
}
