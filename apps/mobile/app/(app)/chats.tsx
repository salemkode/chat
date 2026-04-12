import { useRouter } from 'expo-router'
import { ChatPage } from '../../src/components/chat'

export default function ChatsTabScreen() {
  const router = useRouter()

  return (
    <ChatPage
      mode="new"
      onThreadCreated={(threadId, kind) => {
        if (kind !== 'server') {
          return
        }
        router.replace(`/chat/${threadId}`)
      }}
    />
  )
}
