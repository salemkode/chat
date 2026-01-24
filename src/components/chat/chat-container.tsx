'use client'
import { ChatHeader } from './chat-header'
import { ChatInput } from './chat-input'
import { ChatMessageList } from '@/components/ChatMessageList'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useUIMessages } from '@convex-dev/agent/react'
import { useState } from 'react'

interface Thread {
  _id: string
  title?: string
}

export function ChatContainer() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [model, setModel] = useState<string>('mistralai/devstral-2512:free')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const threads = useQuery(api.agents.listThreadsWithMetadata) || []
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const selectedThread = threads.find((t: Thread) => t._id === selectedThreadId)

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const createThread = useMutation(api.agents.createChatThread)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const sendMessage = useAction(api.agents.generateMessage)

  const { results: messages } = useUIMessages(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    api.chat.listMessages,
    (selectedThreadId ? { threadId: selectedThreadId } : 'skip') as unknown,
    { initialNumItems: 20 },
  )

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return

    let currentThreadId = selectedThreadId

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const lastThread = threads[threads.length - 1]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const isLastThreadEmpty = lastThread && !selectedThreadId

    if (!currentThreadId) {
      if (isLastThreadEmpty) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        currentThreadId = lastThread._id
        setSelectedThreadId(currentThreadId)
      } else {
        currentThreadId = (await createThread({
          title: text.substring(0, 30),
        })) as string
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
