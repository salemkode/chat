import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export function ImageGeneratorHeader({
  onBack,
  onMorePress,
}: {
  onBack: () => void
  onMorePress?: () => void
}) {
  return (
    <SafeAreaView edges={['top']} className="bg-transparent">
      <View className="flex-row items-center px-5 pb-3 pt-1">
        <Pressable
          onPress={onBack}
          accessibilityLabel="Go back"
          className="size-12 items-center justify-center rounded-full border border-black/5 bg-white/85 active:opacity-80"
          style={{
            shadowColor: '#f5ab7f',
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#161616" />
        </Pressable>

        <Text
          className="flex-1 px-4 text-center font-sans-semibold text-[28px] tracking-[-0.8px] text-[#181818]"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Image Generator
        </Text>

        <Pressable
          onPress={onMorePress}
          accessibilityLabel="More options"
          className="size-12 items-center justify-center rounded-full border border-black/5 bg-white/85 active:opacity-80"
          style={{
            shadowColor: '#ef99d0',
            shadowOpacity: 0.16,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#161616" />
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
