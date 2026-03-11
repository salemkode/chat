import { useCallback, useEffect, useRef } from 'react'
import {
  measureElement,
  type VirtualItem,
  useVirtualizer,
} from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import type { OfflineMessageRecord } from '@/offline/schema'
import { Message } from './Message'
import { EmptyChatState } from './EmptyChatState'

interface ChatMessageListProps {
  messages: OfflineMessageRecord[]
  isLoading?: boolean
  className?: string
  modelName?: string
}

export function ChatMessageList({
  messages,
  className,
  modelName,
}: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    getItemKey: (index: number) => messages[index]?.id ?? index,
    estimateSize: (index: number) =>
      messages[index]?.role === 'assistant' ? 220 : 108,
    measureElement,
    overscan: 8,
  })

  const onScroll = useCallback(() => {
    const scrollElement = scrollContainerRef.current
    if (!scrollElement) return
    shouldAutoScrollRef.current = isScrollContainerNearBottom(scrollElement)
  }, [])

  const scrollToLatestMessage = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      if (messages.length === 0) return
      rowVirtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior,
      })
    },
    [messages.length, rowVirtualizer],
  )
  const lastMessage = messages[messages.length - 1]

  useEffect(() => {
    if (messages.length === 0 || !shouldAutoScrollRef.current) {
      return
    }

    const behavior = lastMessage?.status === 'streaming' ? 'auto' : 'smooth'
    const frame = window.requestAnimationFrame(() => {
      scrollToLatestMessage(behavior)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [
    messages.length,
    lastMessage?.status,
    lastMessage?.text,
    scrollToLatestMessage,
  ])

  if (messages.length === 0) {
    return <EmptyChatState />
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className={cn(
        'flex-1 overflow-y-auto pt-4 sm:pt-6 pb-28 sm:pb-32',
        className,
      )}
    >
      <div
        className="relative container"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const msg = messages[virtualRow.index]
          if (!msg) return null
          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-4 sm:pb-6"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <Message message={msg} modelName={modelName} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 120

function isScrollContainerNearBottom(element: HTMLDivElement): boolean {
  return (
    element.scrollHeight - (element.scrollTop + element.clientHeight) <=
    AUTO_SCROLL_BOTTOM_THRESHOLD_PX
  )
}
