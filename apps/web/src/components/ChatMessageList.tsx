import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  type VirtualItem,
  useVirtualizer,
} from '@tanstack/react-virtual'
import type { ChatMessage } from '@/hooks/use-chat-data'
import { buildPromptMessageIdsByIndex } from '@/lib/chat-generation'
import { CHAT_FOLLOW_LATEST_EVENT } from '@/lib/chat-events'
import { cn } from '@/lib/utils'
import { MessageLoadingSkeleton } from './chat/MessageLoadingSkeleton'
import { Message } from './Message'

/** Cap how often we follow a streaming tail — each scroll forces virtualizer + layout work. */
const STREAM_AUTO_SCROLL_MIN_INTERVAL_MS = 100

interface ChatMessageListProps {
  threadId: string
  messages: ChatMessage[]
  isLoading?: boolean
  isLoadingOlder?: boolean
  hasOlderMessages?: boolean
  onLoadOlder?: (numItems: number) => void
  className?: string
  activeAssistantMessageId?: string
  stalledAssistantMessageId?: string
}

export function ChatMessageList({
  threadId,
  messages,
  isLoading = false,
  isLoadingOlder = false,
  hasOlderMessages = false,
  onLoadOlder,
  className,
  activeAssistantMessageId,
  stalledAssistantMessageId,
}: ChatMessageListProps) {
  const isMobile = false
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const forceFollowLatestRef = useRef(false)
  const didInitialBottomAnchorRef = useRef(false)
  const pendingPrependAdjustmentRef = useRef<{
    previousHeight: number
    previousTop: number
  } | null>(null)
  const messageHeightCacheRef = useRef(new Map<string, number>())
  const latestAlignedMessageIdRef = useRef<string | null>(null)
  const lastStreamAutoScrollAtRef = useRef(0)
  const streamAutoScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const promptMessageIdByIndex = useMemo(
    () => buildPromptMessageIdsByIndex(messages),
    [messages],
  )
  const messageIndexById = useMemo(
    () => new Map(messages.map((message, index) => [message.id, index])),
    [messages],
  )
  const latestMessage = messages[messages.length - 1]
  const latestMessageId = latestMessage?.id

  const estimateMessageSize = useCallback(
    (index: number) => {
      const message = messages[index]
      if (!message) {
        return 140
      }

      const cachedHeight = messageHeightCacheRef.current.get(message.id)
      if (cachedHeight !== undefined) {
        return cachedHeight
      }

      return message.role === 'assistant' ? 220 : 108
    },
    [messages],
  )

  const measureMessageElement = useCallback(
    (element: HTMLElement, entry?: ResizeObserverEntry) => {
      const messageId = element.getAttribute('data-message-id')
      const sizes = entry?.borderBoxSize
      const measuredSize = sizes?.[0]?.blockSize
      const nextHeight = Math.ceil(
        measuredSize ?? element.getBoundingClientRect().height,
      )

      if (messageId) {
        messageHeightCacheRef.current.set(messageId, nextHeight)
      }

      return nextHeight
    },
    [],
  )

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    getItemKey: (index: number) => messages[index]?.id ?? index,
    estimateSize: estimateMessageSize,
    measureElement: measureMessageElement,
    overscan: 3,
  })

  useEffect(() => {
    messageHeightCacheRef.current.clear()
    didInitialBottomAnchorRef.current = false
    pendingPrependAdjustmentRef.current = null
    shouldAutoScrollRef.current = true
    forceFollowLatestRef.current = false
    latestAlignedMessageIdRef.current = null
    lastStreamAutoScrollAtRef.current = 0
    if (streamAutoScrollTimeoutRef.current !== null) {
      clearTimeout(streamAutoScrollTimeoutRef.current)
      streamAutoScrollTimeoutRef.current = null
    }
    rowVirtualizer.measure()
  }, [rowVirtualizer, threadId])

  useEffect(() => {
    return () => {
      if (streamAutoScrollTimeoutRef.current !== null) {
        clearTimeout(streamAutoScrollTimeoutRef.current)
        streamAutoScrollTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleFollowLatest = (event: Event) => {
      const customEvent = event as CustomEvent<{ threadId?: string }>
      if (customEvent.detail?.threadId !== threadId) {
        return
      }
      shouldAutoScrollRef.current = true
      forceFollowLatestRef.current = true
    }

    window.addEventListener(CHAT_FOLLOW_LATEST_EVENT, handleFollowLatest)
    return () =>
      window.removeEventListener(CHAT_FOLLOW_LATEST_EVENT, handleFollowLatest)
  }, [threadId])

  const onScroll = useCallback(() => {
    const scrollElement = scrollContainerRef.current
    if (!scrollElement) return
    shouldAutoScrollRef.current = isScrollContainerNearBottom(scrollElement)
    if (!shouldAutoScrollRef.current) {
      forceFollowLatestRef.current = false
    }

    if (
      onLoadOlder &&
      hasOlderMessages &&
      !isLoadingOlder &&
      scrollElement.scrollTop <= LOAD_OLDER_THRESHOLD_PX
    ) {
      pendingPrependAdjustmentRef.current = {
        previousHeight: scrollElement.scrollHeight,
        previousTop: scrollElement.scrollTop,
      }
      onLoadOlder(30)
    }
  }, [hasOlderMessages, isLoadingOlder, onLoadOlder])

  const scrollToMessageId = useCallback(
    (messageId?: string | null, behavior: 'auto' | 'smooth' = 'auto') => {
      if (!messageId) return
      const index = messageIndexById.get(messageId)
      if (index === undefined) return
      rowVirtualizer.scrollToIndex(index, {
        align: 'end',
        behavior,
      })
      latestAlignedMessageIdRef.current = messageId
    },
    [messageIndexById, rowVirtualizer],
  )

  const reconcileBottomAnchor = useCallback(
    (
      messageId?: string | null,
      behavior: 'auto' | 'smooth' = 'auto',
      force = false,
    ) => {
      if (!messageId) {
        return
      }
      if (!force && !shouldAutoScrollRef.current) {
        return
      }

      const run = () => {
        scrollToMessageId(messageId, behavior)
        forceFollowLatestRef.current = false
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(run)
      })
    },
    [scrollToMessageId],
  )

  const scrollToLatestThrottledWhileStreaming = useCallback(() => {
    const run = () => {
      if (
        (!shouldAutoScrollRef.current && !forceFollowLatestRef.current) ||
        !latestMessageId
      ) {
        return
      }
      scrollToMessageId(latestMessageId, 'auto')
      forceFollowLatestRef.current = false
      lastStreamAutoScrollAtRef.current = Date.now()
    }

    const now = Date.now()
    const elapsed = now - lastStreamAutoScrollAtRef.current
    if (elapsed >= STREAM_AUTO_SCROLL_MIN_INTERVAL_MS) {
      if (streamAutoScrollTimeoutRef.current !== null) {
        clearTimeout(streamAutoScrollTimeoutRef.current)
        streamAutoScrollTimeoutRef.current = null
      }
      run()
      return
    }

    if (streamAutoScrollTimeoutRef.current !== null) {
      return
    }

    streamAutoScrollTimeoutRef.current = setTimeout(() => {
      streamAutoScrollTimeoutRef.current = null
      run()
    }, STREAM_AUTO_SCROLL_MIN_INTERVAL_MS - elapsed)
  }, [latestMessageId, scrollToMessageId])

  useLayoutEffect(() => {
    const scrollElement = scrollContainerRef.current
    if (!scrollElement || messages.length === 0) {
      return
    }

    const pendingAdjustment = pendingPrependAdjustmentRef.current
    if (pendingAdjustment) {
      const nextHeight = scrollElement.scrollHeight
      scrollElement.scrollTop =
        pendingAdjustment.previousTop +
        (nextHeight - pendingAdjustment.previousHeight)
      pendingPrependAdjustmentRef.current = null
      return
    }

    if (!didInitialBottomAnchorRef.current) {
      didInitialBottomAnchorRef.current = true
      reconcileBottomAnchor(latestMessageId, 'auto', true)
      return
    }
  }, [latestMessageId, messages.length, reconcileBottomAnchor, rowVirtualizer])

  useEffect(() => {
    if (
      messages.length === 0 ||
      !didInitialBottomAnchorRef.current
    ) {
      return
    }

    const isLive =
      latestMessage?.status === 'streaming' || latestMessage?.status === 'pending'

    if (isLive) {
      scrollToLatestThrottledWhileStreaming()
      return
    }

    if (streamAutoScrollTimeoutRef.current !== null) {
      clearTimeout(streamAutoScrollTimeoutRef.current)
      streamAutoScrollTimeoutRef.current = null
    }

    const frame = window.requestAnimationFrame(() => {
      reconcileBottomAnchor(
        latestMessageId,
        'auto',
        forceFollowLatestRef.current ||
          latestAlignedMessageIdRef.current !== latestMessageId,
      )
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [
    messages.length,
    latestMessage?.status,
    latestMessage?.text,
    latestMessageId,
    reconcileBottomAnchor,
    scrollToLatestThrottledWhileStreaming,
  ])

  if (isLoading && messages.length === 0) {
    return (
      <div
        className={cn(
          'flex-1 overflow-y-auto',
          isMobile
            ? 'pt-3 pb-[calc(var(--mobile-composer-height,11rem)+env(safe-area-inset-bottom)+12px)]'
            : 'pt-4 pb-28 sm:pt-6 sm:pb-32',
          className,
        )}
      >
        <div className="mx-auto w-full max-w-3xl px-3">
          <MessageLoadingSkeleton />
          <MessageLoadingSkeleton />
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div
        className={cn(
          'flex-1 overflow-y-auto',
          isMobile
            ? 'pt-3 pb-[calc(var(--mobile-composer-height,11rem)+env(safe-area-inset-bottom)+12px)]'
            : 'pt-4 pb-28 sm:pt-6 sm:pb-32',
          className,
        )}
      />
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className={cn(
        'flex-1 overflow-y-auto px-3',
        isMobile
          ? 'pt-3 pb-[calc(var(--mobile-composer-height,11rem)+env(safe-area-inset-bottom)+12px)]'
          : 'pt-4 pb-28 sm:pt-6 sm:pb-32',
        className,
      )}
    >
      <div
        className={cn('relative mx-auto w-full max-w-3xl px-3')}
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {hasOlderMessages ? (
          <div className="sticky top-0 z-10 flex justify-center pb-3">
            <div className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
              {isLoadingOlder ? 'Loading older messages...' : 'Scroll up to load older messages'}
            </div>
          </div>
        ) : null}
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const msg = messages[virtualRow.index]
          if (!msg) return null
          const shouldTrackDynamicHeight =
            msg.status === 'streaming' ||
            msg.status === 'pending' ||
            !messageHeightCacheRef.current.has(msg.id)

          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              data-message-id={msg.id}
              ref={shouldTrackDynamicHeight ? rowVirtualizer.measureElement : undefined}
              className={cn(
                'absolute left-0 top-0 w-full',
                isMobile ? 'pb-5' : 'pb-4 sm:pb-6',
              )}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <Message
                threadId={threadId}
                message={msg}
                promptMessageId={promptMessageIdByIndex[virtualRow.index]}
                isActiveGeneration={msg.id === activeAssistantMessageId}
                isStalled={msg.id === stalledAssistantMessageId}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 120
const LOAD_OLDER_THRESHOLD_PX = 160

function isScrollContainerNearBottom(element: HTMLDivElement): boolean {
  return (
    element.scrollHeight - (element.scrollTop + element.clientHeight) <=
    AUTO_SCROLL_BOTTOM_THRESHOLD_PX
  )
}
