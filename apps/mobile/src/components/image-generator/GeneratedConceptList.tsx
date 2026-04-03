import { Image, Text, View } from 'react-native'
import type { GeneratedConcept } from './types'

export function GeneratedConceptList({ concepts }: { concepts: GeneratedConcept[] }) {
  if (!concepts.length) {
    return null
  }

  return (
    <View>
      <Text
        className="mb-4 font-sans-semibold text-[21px] tracking-[-0.5px] text-[#1a1a1a]"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        Recent Concepts
      </Text>

      {concepts.map((concept) => (
        <View
          key={concept.id}
          className="mb-3 rounded-[28px] border border-white/75 bg-white/90 p-4"
          style={{
            shadowColor: '#f1b19f',
            shadowOpacity: 0.12,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
          }}
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text
                numberOfLines={2}
                className="font-sans-medium text-[17px] leading-[24px] text-[#212121]"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {concept.prompt}
              </Text>
              <Text className="mt-2 font-sans text-[13px] text-[#7d7071]">
                {concept.styleLabel} • {concept.ratioLabel} • {concept.createdAt}
              </Text>
            </View>

            {concept.attachments[0] ? (
              <Image
                source={{ uri: concept.attachments[0].uri }}
                className="h-[60px] w-[60px] rounded-[20px]"
                resizeMode="cover"
              />
            ) : (
              <View className="h-[60px] w-[60px] rounded-[20px] bg-[#f8eee7]" />
            )}
          </View>
        </View>
      ))}
    </View>
  )
}
