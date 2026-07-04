import { AppHeader } from '@/components/app-header'
import { ChatAttachmentSheet } from '@/components/chat/attachment-sheet'
import { View } from 'react-native'

export default function AddToChatSheet() {
  return (
    <View className="flex-1 bg-background">
      <AppHeader title="Add to chat" showCloseButton />
      <ChatAttachmentSheet />
    </View>
  )
}
