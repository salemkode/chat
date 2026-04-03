import { Pressable, Text, View } from 'react-native'
import type { ImageRatioOption, RatioId } from './types'

function RatioFrame({
  width,
  height,
  selected,
  custom,
}: {
  width: number
  height: number
  selected: boolean
  custom?: boolean
}) {
  if (custom) {
    return (
      <View className="items-center justify-center">
        <View className="absolute h-[2px] w-8 rounded-full bg-[#8e8e8e]" />
        <View className="absolute h-8 w-[2px] rounded-full bg-[#8e8e8e]" />
      </View>
    )
  }

  return (
    <View
      className={`rounded-[12px] border ${selected ? 'border-[#1d1d1d]' : 'border-[#7f7f7f]'}`}
      style={{ width, height }}
    />
  )
}

export function ImageRatioPicker({
  options,
  selectedRatio,
  onSelectRatio,
}: {
  options: ImageRatioOption[]
  selectedRatio: RatioId
  onSelectRatio: (id: RatioId) => void
}) {
  return (
    <View>
      <Text
        className="mb-4 font-sans-semibold text-[21px] tracking-[-0.5px] text-[#1a1a1a]"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        Select Aspect Ratio
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {options.map((option) => {
          const selected = option.id === selectedRatio
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelectRatio(option.id)}
              className={`mb-4 items-center ${selected ? 'opacity-100' : 'opacity-90'}`}
              style={{ width: '23%' }}
            >
              <View
                className={`h-[86px] w-full items-center justify-center rounded-[24px] border bg-white ${selected ? 'border-[#f0a15b]' : 'border-white/70'}`}
                style={{
                  shadowColor: selected ? '#f2a25e' : '#f5c8cc',
                  shadowOpacity: selected ? 0.18 : 0.08,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: selected ? 6 : 3,
                }}
              >
                <RatioFrame
                  width={option.width * 34}
                  height={option.height * 34}
                  selected={selected}
                  custom={option.id === 'custom'}
                />
              </View>
              <Text
                className="mt-2 text-center font-sans text-[15px] text-[#353535]"
                style={{ fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular' }}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
