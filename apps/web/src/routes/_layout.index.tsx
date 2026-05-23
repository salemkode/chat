import { ChatMessageList } from '@/components/chat-message-list'
import { ChatThreadHeader } from '@/components/chat/chat-thread-header'
import { useMessages } from '@/hooks/use-chat-data'

export default function NewChatIndex() {
  const { messages } = useMessages()

  return (
    <div className="flex h-full flex-col">
      <ChatThreadHeader title="New Chat" />

      <ChatMessageList threadId="new" messages={messages} />
    </div>
  )
}
