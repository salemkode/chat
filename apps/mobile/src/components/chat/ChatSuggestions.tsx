import { Pressable, Text, View } from 'react-native'
import type { ChatSuggestion } from '@chat/shared'
import { CHAT_BORDER, CHAT_CARD, CHAT_FG, CHAT_FG_MUTED } from './constants'

export function ChatSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: ChatSuggestion[]
  onSelect: (prompt: string) => void
}) {
  return (
    <View style={{ marginBottom: 10, gap: 10 }}>
      <View>
        <Text
          style={{
            fontSize: 14,
            color: CHAT_FG,
            fontFamily: 'Inter_500Medium',
          }}
        >
          Try one to start
        </Text>
        <Text
          style={{
            marginTop: 3,
            fontSize: 12,
            color: CHAT_FG_MUTED,
            fontFamily: 'Inter_400Regular',
          }}
        >
          Suggestions fill the composer so you can edit before sending.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion.id}
            onPress={() => onSelect(suggestion.prompt)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: CHAT_BORDER,
              backgroundColor: CHAT_CARD,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: CHAT_FG,
                fontFamily: 'Inter_500Medium',
              }}
            >
              {suggestion.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
