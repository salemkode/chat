import { useUIMessages } from '@convex-dev/agent/react'
import type { FunctionReturnType } from 'convex/server'
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

type ListMessage = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

type UseMessagesResult = {
  messages: ChatMessage[]
  status: ReturnType<typeof useUIMessages<typeof api.chat.listMessages>>['status']
  hasMore: boolean
  isLoadingMore: boolean
  hasRenderableMessages: boolean
  loadOlderMessages: (numItems: number) => void
}

function toCachedChatMessage(message: LocalCachedMessageRow): ChatMessage {
  return {
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
  }
}

function toLiveChatMessage(message: ListMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    text: message.text ?? '',
    parts: message.parts ?? [],
    status:
      message.status === 'pending' ||
      message.status === 'streaming' ||
      message.status === 'failed'
        ? message.status
        : 'success',
    order: message.order,
    stepOrder: message.stepOrder,
    createdAt: message.order,
    failureKind: message.failureKind,
    failureMode: message.failureMode,
    failureNote: message.failureNote,
  }
}

export function useMessages(threadId?: string): UseMessagesResult {
  const cacheUserId = useConvexUserIdForCache()
  const cacheVersion = useOfflineCacheVersion()
  const [streamEnabled, setStreamEnabled] = useState(Boolean(threadId))
  const stableSignatureRef = useRef('')
  const stableSnapshotCountRef = useRef(0)
  const queryArgs = { threadId: threadId ?? '' }
  const paginatedMessages = useUIMessages(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
    stream: Boolean(threadId) && streamEnabled,
  })
  const { results, status, loadMore } = paginatedMessages

  const cachedMessages = useMemo(() => {
    if (!threadId || !cacheUserId) {
      return []
    }
    const raw = readMessagesCache<LocalCachedMessageRow[]>(cacheUserId, threadId)
    if (!Array.isArray(raw)) {
      return []
    }
    return raw.map(toCachedChatMessage)
  }, [threadId, cacheUserId, cacheVersion])

  const liveResults = useMemo(() => {
    if (!threadId || results === undefined) {
      return undefined
    }
    return results.map(toLiveChatMessage)
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

    const lastMessage = liveMessages[liveMessages.length - 1]
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
    const handleResume = (event: CustomEvent<{ threadId?: string }>) => {
      if (!threadId || !event.detail?.threadId) {
        return
      }
      if (event.detail.threadId === threadId) {
        stableSignatureRef.current = ''
        stableSnapshotCountRef.current = 0
        setStreamEnabled(true)
      }
    }
    window.addEventListener(CHAT_STREAM_RESUME_EVENT, handleResume as EventListener)
    return () => window.removeEventListener(CHAT_STREAM_RESUME_EVENT, handleResume as EventListener)
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
