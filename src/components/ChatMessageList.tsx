import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { FunctionReturnType } from 'convex/server'
import { api } from 'convex/_generated/api'
import { Message } from './Message'

interface ChatMessageListProps {
  messages: FunctionReturnType<typeof api.chat.listMessages>['page']
  isLoading?: boolean
  className?: string
}

export function ChatMessageList({ messages, className }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [_copiedId, _setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  const _handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    _setCopiedId(id)
    setTimeout(() => _setCopiedId(null), 2000)
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-7 w-7 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <title>Chat Icon</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </div>
          <p className="text-sm">Start a new conversation</p>
        </div>
      </div>
    )
  }

  const _formatTime = (timestamp?: string | number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const _formatDate = (timestamp?: string | number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className={cn('flex-1 space-y-6 overflow-y-auto px-4 py-6', className)}
    >
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}
