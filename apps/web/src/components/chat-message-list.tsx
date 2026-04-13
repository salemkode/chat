import { LegendList, type LegendListRef } from '@legendapp/list/react'
import { useEffect, useMemo, useRef } from 'react'
import type { ChatMessage } from '@/hooks/use-chat-data'
import { buildPromptMessageIdsByIndex } from '@/lib/chat-generation'
import { CHAT_FOLLOW_LATEST_EVENT } from '@/lib/chat-events'
import { cn } from '@/lib/utils'
import { Message } from './message'

interface ChatMessageListProps {
  threadId: string
  messages: ChatMessage[]
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
  isLoadingOlder = false,
  hasOlderMessages = false,
  onLoadOlder,
  className,
  activeAssistantMessageId,
  stalledAssistantMessageId,
}: ChatMessageListProps) {
  const listRef = useRef<LegendListRef | null>(null)

  const promptMessageIdByIndex = useMemo(() => buildPromptMessageIdsByIndex(messages), [messages])
  const latestMessage = messages[messages.length - 1]

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleFollowLatest = (event: Event) => {
      const customEvent = event as CustomEvent<{ threadId?: string }>
      if (customEvent.detail?.threadId !== threadId) {
        return
      }
      void listRef.current?.scrollToEnd({ animated: true })
    }

    window.addEventListener(CHAT_FOLLOW_LATEST_EVENT, handleFollowLatest)
    return () => window.removeEventListener(CHAT_FOLLOW_LATEST_EVENT, handleFollowLatest)
  }, [threadId])
  const dataVersion = `${messages.length}:${latestMessage?.id ?? ''}:${latestMessage?.status ?? ''}:${latestMessage?.text ?? ''}:${activeAssistantMessageId ?? ''}:${stalledAssistantMessageId ?? ''}`

  if (messages.length === 0) {
    return (
      <div className={cn('flex-1 overflow-y-auto', 'pt-4 pb-28 sm:pt-6 sm:pb-32', className)} />
    )
  }

  return (
    <div className={cn('flex-1 min-h-0', className)}>
      <LegendList
        ref={listRef}
        data={messages}
        dataVersion={dataVersion}
        keyExtractor={(message) => message.id}
        estimatedItemSize={180}
        getEstimatedItemSize={(message) => (message.role === 'assistant' ? 220 : 108)}
        drawDistance={600}
        alignItemsAtEnd
        initialScrollAtEnd
        maintainScrollAtEnd
        maintainScrollAtEndThreshold={0.15}
        maintainVisibleContentPosition={{ data: true, size: true }}
        onStartReached={
          onLoadOlder && hasOlderMessages && !isLoadingOlder ? () => onLoadOlder(30) : undefined
        }
        onStartReachedThreshold={0.15}
        style={{ height: '100%' }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 128,
          paddingLeft: 12,
          paddingRight: 12,
        }}
        ListHeaderComponent={
          hasOlderMessages ? (
            <div className="flex justify-center pb-3">
              <div className="rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                {isLoadingOlder ? 'Loading older messages...' : 'Scroll up to load older messages'}
              </div>
            </div>
          ) : null
        }
        renderItem={({ item: msg, index }) => (
          <div className="pb-4 sm:pb-6">
            <div className="mx-auto w-full max-w-3xl px-3">
              <Message
                threadId={threadId}
                message={msg}
                promptMessageId={promptMessageIdByIndex[index]}
                isActiveGeneration={msg.id === activeAssistantMessageId}
                isStalled={msg.id === stalledAssistantMessageId}
              />
            </div>
          </div>
        )}
      />
    </div>
  )
}
