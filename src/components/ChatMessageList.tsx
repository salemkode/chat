import { useCallback, useEffect, useRef } from 'react'
import {
  measureElement,
  type VirtualItem,
  useVirtualizer,
} from '@tanstack/react-virtual'
import type { FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { MessageLoadingSkeleton } from './chat/MessageLoadingSkeleton'
import { Message } from './Message'
import { EmptyChatState } from './EmptyChatState'

interface ChatMessageListProps {
  threadId: string
  messages: FunctionReturnType<typeof api.chat.listMessages>['page']
  isLoading?: boolean
  className?: string
}

export function ChatMessageList({
  threadId,
  messages,
  isLoading = false,
  className,
}: ChatMessageListProps) {
  const isMobile = false
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
    (behavior: 'auto' | 'smooth' = 'auto') => {
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
    return <EmptyChatState />
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
        {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
          const msg = messages[virtualRow.index]
          if (!msg) return null
          return (
            <div
              key={msg.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className={cn(
                'absolute left-0 top-0 w-full',
                isMobile ? 'pb-5' : 'pb-4 sm:pb-6',
              )}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <Message
                threadId={threadId}
                message={msg}
                promptMessageId={findPromptMessageId(messages, virtualRow.index)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function findPromptMessageId(
  messages: ChatMessageListProps['messages'],
  assistantIndex: number,
) {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'user') {
      return message.id
    }
  }

  return undefined
}

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 120

function isScrollContainerNearBottom(element: HTMLDivElement): boolean {
  return (
    element.scrollHeight - (element.scrollTop + element.clientHeight) <=
    AUTO_SCROLL_BOTTOM_THRESHOLD_PX
  )
}
