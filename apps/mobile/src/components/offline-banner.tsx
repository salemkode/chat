import { Text, View } from 'react-native'

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <View className="mb-2.5 rounded-2xl border border-amber-600 bg-card px-3 py-2.5">
      <Text className="text-[14px] text-amber-400" style={{ fontFamily: 'Inter_500Medium' }}>
        Offline — read-only until you reconnect.
      </Text>
    </View>
  )
}
