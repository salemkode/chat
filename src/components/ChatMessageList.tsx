import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { Message } from './Message'
import { EmptyChatState } from './EmptyChatState'

interface ChatMessageListProps {
  messages: FunctionReturnType<typeof api.chat.listMessages>['page']
  isLoading?: boolean
  className?: string
  modelName?: string
}

export function ChatMessageList({ messages, className, modelName }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  if (messages.length === 0) {
    return <EmptyChatState />
  }

  return (
    <div
      className={cn('flex-1 overflow-y-auto px-4 pt-6 pb-32', className)}
    >
      <div className="space-y-6 container mx-auto">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} modelName={modelName} />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
}
