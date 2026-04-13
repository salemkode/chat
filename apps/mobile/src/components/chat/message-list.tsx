import { useEffect, useMemo, useRef } from 'react'
import { FlashList } from '@shopify/flash-list'
import { Text, View } from 'react-native'
import { CHAT_FG, CHAT_FG_MUTED } from './constants'
import { MessageRow } from './message-row'
import type { ChatRenderableMessage } from './types'

export function MessageList({
  messages,
  title,
  onReplayFailedMessage,
}: {
  messages: ChatRenderableMessage[]
  title: string
  onReplayFailedMessage?: (messageId: string) => void
}) {
  const listRef = useRef<any>(null)
  const lastMessageSignature = useMemo(() => {
    const lastMessage = messages[messages.length - 1]
    return lastMessage
      ? `${lastMessage.id}:${lastMessage.status ?? ''}:${lastMessage.text ?? ''}:${lastMessage.attachments?.length ?? 0}`
      : ''
  }, [messages])

  useEffect(() => {
    if (messages.length === 0) {
      return
    }

    const timeoutId = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [lastMessageSignature, messages.length])

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
        Send a message to start. You can attach documents, and images on models with vision support.
      </Text>
    </View>
  )

  return (
    <FlashList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 12,
        flexGrow: 1,
      }}
      ListEmptyComponent={messages.length === 0 ? emptyWelcome : null}
      ListFooterComponent={<View style={{ height: 12 }} />}
      renderItem={({ item }) => <MessageRow message={item} onReplay={onReplayFailedMessage} />}
    />
  )
}
