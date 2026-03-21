import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  type VirtualItem,
  useVirtualizer,
} from '@tanstack/react-virtual'
import type { ChatMessage } from '@/hooks/use-chat-data'
import { buildPromptMessageIdsByIndex } from '@/lib/chat-generation'
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
  const didInitialBottomAnchorRef = useRef(false)
  const pendingPrependAdjustmentRef = useRef<{
    previousHeight: number
    previousTop: number
  } | null>(null)
  const messageHeightCacheRef = useRef(new Map<string, number>())
  const lastStreamAutoScrollAtRef = useRef(0)
  const streamAutoScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const promptMessageIdByIndex = useMemo(
    () => buildPromptMessageIdsByIndex(messages),
    [messages],
  )

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

  const onScroll = useCallback(() => {
    const scrollElement = scrollContainerRef.current
    if (!scrollElement) return
    shouldAutoScrollRef.current = isScrollContainerNearBottom(scrollElement)

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

  const scrollToLatestMessage = useCallback(
    (behavior: 'auto' | 'smooth' = 'auto') => {
      if (messages.length === 0) return
      rowVirtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior,
      })
    },
    [messages.length, rowVirtualizer],
  )

  const scrollToLatestThrottledWhileStreaming = useCallback(() => {
    const run = () => {
      if (!shouldAutoScrollRef.current || messages.length === 0) {
        return
      }
      scrollToLatestMessage('auto')
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
  }, [messages.length, scrollToLatestMessage])

  const lastMessage = messages[messages.length - 1]

  useLayoutEffect(() => {
    const scrollElement = scrollContainerRef.current
    if (!scrollElement || messages.length === 0) {
      return
    }

    if (!didInitialBottomAnchorRef.current) {
      didInitialBottomAnchorRef.current = true
      rowVirtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'auto',
      })
      return
    }

    const pendingAdjustment = pendingPrependAdjustmentRef.current
    if (!pendingAdjustment) {
      return
    }

    const nextHeight = scrollElement.scrollHeight
    scrollElement.scrollTop =
      pendingAdjustment.previousTop + (nextHeight - pendingAdjustment.previousHeight)
    pendingPrependAdjustmentRef.current = null
  }, [messages.length, rowVirtualizer])

  useEffect(() => {
    if (
      messages.length === 0 ||
      !shouldAutoScrollRef.current ||
      !didInitialBottomAnchorRef.current
    ) {
      return
    }

    const isLive =
      lastMessage?.status === 'streaming' || lastMessage?.status === 'pending'

    if (isLive) {
      scrollToLatestThrottledWhileStreaming()
      return
    }

    if (streamAutoScrollTimeoutRef.current !== null) {
      clearTimeout(streamAutoScrollTimeoutRef.current)
      streamAutoScrollTimeoutRef.current = null
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToLatestMessage('auto')
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [
    messages.length,
    lastMessage?.status,
    lastMessage?.text,
    scrollToLatestMessage,
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
