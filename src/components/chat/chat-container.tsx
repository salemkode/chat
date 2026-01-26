'use client'
import { ChatHeader } from './chat-header'
import { ChatInput } from './chat-input'
import { ChatMessageList } from '@/components/ChatMessageList'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useUIMessages } from '@/hooks/agent'
import { useState } from 'react'

interface Thread {
  _id: string
  title?: string
}

export function ChatContainer() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [model, setModel] = useState<string>('mistralai/devstral-2512:free')

  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  const selectedThread = threads.find((t: Thread) => t._id === selectedThreadId)

  const createThread = useMutation(api.agents.createChatThread)
  const sendMessage = useAction(api.agents.generateMessage)

  const { results: messages } = useUIMessages(
    api.chat.listMessages,
    selectedThreadId ? { threadId: selectedThreadId } : 'skip',
    { initialNumItems: 20 },
  )

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return

    let currentThreadId = selectedThreadId

    const lastThread = threads[threads.length - 1]
    const isLastThreadEmpty = lastThread && !selectedThreadId

    if (!currentThreadId) {
      if (isLastThreadEmpty) {
        currentThreadId = lastThread._id
        setSelectedThreadId(currentThreadId)
      } else {
        currentThreadId = await createThread({ title: text.substring(0, 30) })
        setSelectedThreadId(currentThreadId)
      }
    }

    await sendMessage({
      threadId: currentThreadId,
      text,
      model,
    })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader
        title={selectedThread?.title || 'New Chat'}
        model={model}
        onModelChange={setModel}
      />
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.03] pointer-events-none" />
        <ChatMessageList messages={messages || []} className="h-full" />
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        hasActiveThread={!!selectedThreadId}
      />
    </div>
  )
}
