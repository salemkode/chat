import { Image, Linking, Pressable, Text, View } from 'react-native'
import { EnrichedMarkdownText } from 'react-native-enriched-markdown'
import { CHAT_BORDER, CHAT_CARD, CHAT_FG, CHAT_FG_MUTED, markdownDarkStyle } from './constants'
import type { ChatRenderableMessage } from './types'

export function MessageRow({
  message,
  onRetry,
}: {
  message: ChatRenderableMessage
  onRetry?: (messageId: string) => void
}) {
  const isAssistant = message.role === 'assistant'
  const imageAttachments = (message.attachments ?? []).filter((attachment) => attachment.kind === 'image')
  const fileAttachments = (message.attachments ?? []).filter((attachment) => attachment.kind === 'file')
  const hasText = Boolean(message.text?.trim())
  const hasContent = hasText || imageAttachments.length > 0 || fileAttachments.length > 0
  const isStreamingPlaceholder = isAssistant && message.status === 'streaming' && !hasContent
  const isFailed = message.status === 'failed'

  return (
    <View
      style={{
        marginBottom: 12,
        alignSelf: isAssistant ? 'stretch' : 'flex-end',
        paddingRight: isAssistant ? 24 : 0,
        paddingLeft: isAssistant ? 0 : 48,
      }}
    >
      <View
        style={
          isAssistant
            ? {
                borderRadius: 16,
                backgroundColor: CHAT_CARD,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }
            : {
                borderRadius: 22,
                backgroundColor: '#2f3138',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }
        }
      >
        {hasContent ? (
          <>
            {hasText ? (
              isAssistant ? (
                <EnrichedMarkdownText
                  markdown={message.text || ''}
                  markdownStyle={markdownDarkStyle}
                  onLinkPress={({ url }) => {
                    void Linking.openURL(url)
                  }}
                  flavor="github"
                />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    lineHeight: 22,
                    color: CHAT_FG,
                    fontFamily: 'Inter_400Regular',
                  }}
                >
                  {message.text}
                </Text>
              )
            ) : null}

            {imageAttachments.map((attachment, index) => (
              <Pressable
                key={`${attachment.url}-${index}`}
                onPress={() => {
                  void Linking.openURL(attachment.url)
                }}
                style={{ marginTop: hasText || index > 0 ? 10 : 0 }}
              >
                <Image
                  source={{ uri: attachment.url }}
                  style={{
                    width: 220,
                    height: 180,
                    borderRadius: 14,
                    backgroundColor: '#1b1d22',
                  }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}

            {fileAttachments.map((attachment, index) => (
              <Pressable
                key={`${attachment.url}-${index}`}
                onPress={() => {
                  void Linking.openURL(attachment.url)
                }}
                style={{
                  marginTop:
                    hasText || imageAttachments.length > 0 || index > 0 ? 10 : 0,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: CHAT_BORDER,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: CHAT_FG,
                    fontSize: 14,
                    fontFamily: 'Inter_500Medium',
                  }}
                >
                  {attachment.filename ?? 'Attachment'}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 2,
                    color: CHAT_FG_MUTED,
                    fontSize: 12,
                    fontFamily: 'Inter_400Regular',
                  }}
                >
                  {attachment.mediaType}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {isStreamingPlaceholder ? (
          <Text
            style={{
              fontSize: 14,
              color: CHAT_FG_MUTED,
              fontFamily: 'Inter_400Regular',
            }}
          >
            Thinking...
          </Text>
        ) : null}

        {isFailed ? (
          <View style={{ marginTop: hasContent || isStreamingPlaceholder ? 10 : 0 }}>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 18,
                color: '#eaa3af',
                fontFamily: 'Inter_400Regular',
              }}
            >
              {message.errorText || 'Failed to send message.'}
            </Text>
            {message.retryable && onRetry ? (
              <Pressable
                onPress={() => onRetry(message.id)}
                style={{ marginTop: 6, alignSelf: 'flex-start' }}
              >
                <Text
                  style={{
                    color: '#4a9cff',
                    fontSize: 14,
                    fontFamily: 'Inter_500Medium',
                  }}
                >
                  Retry
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}
