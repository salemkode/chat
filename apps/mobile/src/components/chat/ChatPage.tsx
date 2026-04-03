import { useRouter } from 'expo-router'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { OfflineBanner } from '../OfflineBanner'
import { ModelPickerDialog } from '../dialog'
import { ChatComposer } from './ChatComposer'
import { ChatHeader } from './ChatHeader'
import { MessageList } from './MessageList'
import { useChatConversation } from './useChatConversation'
import type { ChatScreenMode } from './types'

export function ChatPage({
  mode,
  threadId,
  onThreadCreated,
  onMenuPress,
}: {
  mode: ChatScreenMode
  threadId?: string
  onThreadCreated?: (threadId: string, kind: 'local' | 'server') => void
  onMenuPress?: () => void
}) {
  const router = useRouter()
  const c = useChatConversation({
    mode,
    threadId,
    showHeader: true,
    onThreadCreated,
  })

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ChatHeader
        title={c.header.title}
        leftIcon={mode === 'existing' ? 'chevron-back' : 'menu'}
        onLeftPress={
          mode === 'existing' ? () => router.back() : onMenuPress
        }
        activeProjectName={c.header.activeProjectName}
        onRemoveProject={c.header.onRemoveProject}
      />

      <View style={{ paddingHorizontal: 16, backgroundColor: c.bg }}>
        <OfflineBanner visible={c.offlineBanner.visible} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: c.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1, minHeight: 0, backgroundColor: c.bg }}>
          <MessageList
            threadId={c.messageList.threadId}
            title={c.messageList.title}
            onRetryFailedMessage={c.messageList.onRetryFailedMessage}
          />
        </View>

        <ChatComposer {...c.composer} />
      </KeyboardAvoidingView>

      <ModelPickerDialog {...c.modelPicker} />
    </View>
  )
}
