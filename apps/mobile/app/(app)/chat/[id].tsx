import { useLocalSearchParams } from 'expo-router'
import { Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChatPage } from '../../../src/components/chat'

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-background p-4">
        <Text className="font-sans text-foreground">Invalid chat id.</Text>
      </SafeAreaView>
    )
  }

  return <ChatPage mode="existing" threadId={id} />
}
