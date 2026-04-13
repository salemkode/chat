import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CHAT_BG, CHAT_BORDER, CHAT_FG, CHAT_FG_MUTED } from './constants'

export function ChatHeader({
  title,
  activeProjectName,
  leftIcon = 'menu',
  onLeftPress,
  onRemoveProject,
}: {
  title: string
  activeProjectName?: string
  leftIcon?: 'menu' | 'chevron-back'
  onLeftPress?: () => void
  onRemoveProject?: () => void
}) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: CHAT_BG }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: CHAT_BORDER,
          backgroundColor: CHAT_BG,
        }}
      >
        <Pressable
          onPress={onLeftPress}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={leftIcon === 'menu' ? 'Open sidebar' : 'Back'}
          disabled={!onLeftPress}
        >
          <Ionicons name={leftIcon} size={26} color={onLeftPress ? CHAT_FG : 'transparent'} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 8, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              textAlign: 'center',
              fontSize: 17,
              color: CHAT_FG,
              fontFamily: 'Inter_600SemiBold',
            }}
          >
            {title}
          </Text>
          {activeProjectName ? (
            <View
              style={{
                marginTop: 2,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  maxWidth: '70%',
                  fontSize: 12,
                  color: CHAT_FG_MUTED,
                  fontFamily: 'Inter_400Regular',
                }}
              >
                {activeProjectName}
              </Text>
              {onRemoveProject ? (
                <Pressable onPress={onRemoveProject} hitSlop={8}>
                  <Text style={{ fontSize: 12, color: '#4a9cff', fontFamily: 'Inter_400Regular' }}>
                    Remove
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={{ width: 40, height: 40 }} />
      </View>
    </SafeAreaView>
  )
}
