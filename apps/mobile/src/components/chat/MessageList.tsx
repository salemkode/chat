import { FlashList } from '@shopify/flash-list'
import { Text, View } from 'react-native'
import { useMessages } from '../../mobile-data/use-message-list'
import { CHAT_FG, CHAT_FG_MUTED } from './constants'
import { MessageRow } from './MessageRow'
import type { ChatRenderableMessage } from './types'

export function MessageList({
  threadId,
  title,
  onRetryFailedMessage,
}: {
  threadId?: string
  title: string
  onRetryFailedMessage?: (messageId: string) => void
}) {
  const { messages } = useMessages(threadId)
  const list = messages as ChatRenderableMessage[]
  const emptyWelcome = (
    <View
      style={{
        paddingVertical: 56,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 22,
          color: CHAT_FG,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          color: CHAT_FG_MUTED,
          textAlign: 'center',
          marginTop: 10,
          lineHeight: 22,
        }}
      >
        Send a message to start. You can attach images or documents below.
      </Text>
    </View>
  )

  return (
    <FlashList
      data={list}
      keyExtractor={(item) => item.id}
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingTop: 8,
        flexGrow: 1,
      }}
      ListEmptyComponent={list.length === 0 ? emptyWelcome : null}
      ListFooterComponent={<View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <MessageRow message={item} onRetry={onRetryFailedMessage} />
      )}
    />
  )
}
