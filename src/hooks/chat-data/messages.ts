import { useUIMessages } from '@convex-dev/agent/react'
import type { UsePaginatedQueryResult } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import {
  buildMessageProgressSignature,
  getLatestActiveAssistant,
  isGenerationStalled,
} from '@/lib/chat-generation'
import { readMessagesCache } from '@/offline/local-cache'
import {
  cacheMessagesToLocal,
  type ChatMessage,
  type LocalCachedMessageRow,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

export type UseMessagesResult = {
  messages: ChatMessage[]
  status: UsePaginatedQueryResult<ChatMessage>['status']
  hasMore: boolean
  isLoadingMore: boolean
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
    return raw
      .slice()
      .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
      .map(
        (message) =>
          ({
            id: message.id,
            role: message.role,
            text: message.text,
            parts: message.parts,
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

  const pendingCacheWriteRef = useRef<number | null>(null)
  const lastCachedSignatureRef = useRef('')
  const hasStreamingMessages = useMemo(
    () =>
      Boolean(
        results?.some(
          (message) =>
            message.status === 'streaming' || message.status === 'pending',
        ),
      ),
    [results],
  )
  const cacheSignature = useMemo(() => {
    if (!threadId || !results || results.length === 0) {
      return ''
    }

    const lastMessage = results[results.length - 1] as {
      id?: string
      status?: string
      text?: string
    }
    return [
      threadId,
      results.length,
      lastMessage?.id || '',
      lastMessage?.status || '',
      lastMessage?.text?.length || 0,
      hasStreamingMessages ? 1 : 0,
    ].join(':')
  }, [hasStreamingMessages, results, threadId])

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
    window.addEventListener('chat-stream:resume', handleResume)
    return () => window.removeEventListener('chat-stream:resume', handleResume)
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
    if (
      !threadId ||
      !cacheUserId ||
      !results ||
      results.length === 0 ||
      !cacheSignature
    ) {
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
      const snapshot = results
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
  }, [cacheSignature, cacheUserId, hasStreamingMessages, results, threadId])

  return {
    messages: results && results.length > 0 ? results : cachedMessages || [],
    status,
    hasMore: status === 'CanLoadMore' || status === 'LoadingMore',
    isLoadingMore: status === 'LoadingMore',
    loadOlderMessages: loadMore,
  }
}

export function useGenerationState(messages: ChatMessage[]) {
  const activeGeneration = useMemo(
    () => getLatestActiveAssistant(messages),
    [messages],
  )
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
