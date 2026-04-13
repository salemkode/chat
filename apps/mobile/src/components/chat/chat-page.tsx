import { DrawerActions, useNavigation } from '@react-navigation/native'
import { KeyboardAvoidingView, Platform, View } from 'react-native'
import { OfflineBanner } from '../offline-banner'
import { ModelPickerDialog } from '../dialog'
import { ChatComposer } from './chat-composer'
import { ChatHeader } from './chat-header'
import { MessageList } from './message-list'
import { useChatConversation } from './use-chat-conversation'
import type { ChatScreenMode } from './types'

export function ChatPage({
  mode,
  threadId,
  onThreadCreated,
}: {
  mode: ChatScreenMode
  threadId?: string
  onThreadCreated?: (threadId: string, kind: 'local' | 'server') => void
}) {
  const navigation = useNavigation()
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
        leftIcon="menu"
        onLeftPress={() => navigation.dispatch(DrawerActions.openDrawer())}
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
            messages={c.messageList.messages}
            title={c.messageList.title}
            onReplayFailedMessage={c.messageList.onReplayFailedMessage}
          />
        </View>

        <ChatComposer {...c.composer} />
      </KeyboardAvoidingView>

      <ModelPickerDialog {...c.modelPicker} />
    </View>
  )
}
