import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import type { ImageStyleOption, StyleId } from './types'

function ColorOrb({ color, className }: { color: string; className: string }) {
  return (
    <View
      className={`absolute rounded-full ${className}`}
      style={{ backgroundColor: color }}
    />
  )
}

function StyleArtwork({ variant }: { variant: StyleId }) {
  if (variant === 'none') {
    return (
      <View className="h-full w-full items-center justify-center rounded-[22px] bg-white">
        <View className="size-[34px] items-center justify-center rounded-[12px] bg-[#111111]">
          <Ionicons name="image-outline" size={19} color="#f7f3ee" />
        </View>
      </View>
    )
  }

  if (variant === 'realistic') {
    return (
      <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#173c58]">
        <ColorOrb color="#ff6e4a" className="-left-3 top-1 h-14 w-14 opacity-70" />
        <ColorOrb color="#7f4df9" className="right-0 top-0 h-10 w-10 opacity-65" />
        <ColorOrb color="#f6b140" className="left-6 top-6 h-8 w-8 opacity-80" />
        <View className="absolute bottom-0 left-3 right-3 top-5 rounded-[28px] bg-[#2d5f8f]" />
        <View className="absolute bottom-0 left-[26px] h-[58px] w-[46px] rounded-t-[28px] bg-[#efc6b5]" />
        <View className="absolute left-[16px] top-[22px] h-[48px] w-[66px] rounded-[30px] bg-[#0a1d31]" />
      </View>
    )
  }

  if (variant === 'anime') {
    return (
      <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#180a2f]">
        <ColorOrb color="#ff6ec7" className="-left-1 top-2 h-9 w-9 opacity-80" />
        <ColorOrb color="#00d0ff" className="right-2 top-0 h-11 w-11 opacity-75" />
        <ColorOrb color="#ffe35b" className="bottom-2 left-5 h-8 w-8 opacity-75" />
        <View className="absolute inset-[12px] rounded-full border border-white/20" />
        <View className="absolute inset-[20px] rounded-full border border-white/15" />
        <View className="absolute inset-[28px] rounded-full border border-white/20" />
        <View className="absolute inset-[25px] rounded-full bg-[#07111f]" />
      </View>
    )
  }

  if (variant === 'three-d') {
    return (
      <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#97d3ca]">
        <ColorOrb color="#f6a0b6" className="-right-3 bottom-2 h-16 w-16 opacity-60" />
        <ColorOrb color="#ffd67c" className="-left-4 top-1 h-14 w-14 opacity-55" />
        <View className="absolute bottom-0 left-[18px] h-[56px] w-[44px] rounded-t-[26px] bg-[#f4d9cf]" />
        <View className="absolute left-[11px] top-[18px] h-[46px] w-[58px] rounded-[26px] bg-[#85b8dd]" />
      </View>
    )
  }

  if (variant === 'editorial') {
    return (
      <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#10254d]">
        <ColorOrb color="#ffdc75" className="right-1 top-1 h-12 w-12 opacity-75" />
        <ColorOrb color="#f7f0d6" className="left-1 top-0 h-16 w-16 opacity-70" />
        <View className="absolute bottom-0 left-0 right-0 h-[30px] bg-[#5a4231]" />
        <View className="absolute bottom-[22px] left-[20px] h-[26px] w-[36px] rounded-t-full bg-[#e7c69d]" />
        <View className="absolute bottom-[22px] left-[8px] h-[22px] w-[56px] rounded-[18px] bg-[#735235]" />
      </View>
    )
  }

  if (variant === 'landscape') {
    return (
      <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#f39b5f]">
        <View className="absolute inset-x-0 top-0 h-[44px] bg-[#ffcf8b]" />
        <View className="absolute bottom-0 left-0 right-0 h-[26px] bg-[#402852]" />
        <View className="absolute bottom-[18px] left-[-4px] h-[30px] w-[90px] rounded-t-full bg-[#6c3c63]" />
        <View className="absolute bottom-[14px] left-[32px] h-[52px] w-[3px] bg-[#231423]" />
      </View>
    )
  }

  if (variant === 'portrait') {
    return (
      <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#899ab8]">
        <View className="absolute bottom-0 left-0 right-0 h-[26px] bg-[#6f6866]" />
        <View className="absolute bottom-[18px] left-[18px] h-[30px] w-[40px] rounded-t-[18px] bg-[#e9cbb2]" />
        <View className="absolute left-[14px] top-[14px] h-[44px] w-[50px] rounded-[22px] bg-[#d7e1f0]" />
        <View className="absolute left-[20px] top-[10px] h-[26px] w-[36px] rounded-full bg-[#d4b9a4]" />
      </View>
    )
  }

  return (
    <View className="h-full w-full overflow-hidden rounded-[22px] bg-[#2d2a4e]">
      <View className="absolute inset-[8px] rounded-full border border-[#8ea0ff]/35" />
      <View className="absolute inset-[17px] rounded-full border border-[#68e3ff]/35" />
      <View className="absolute inset-[26px] rounded-full bg-[#10131d]" />
      <ColorOrb color="#6ce3ff" className="left-1 top-1 h-12 w-12 opacity-75" />
      <ColorOrb color="#ffb45f" className="bottom-1 right-1 h-10 w-10 opacity-75" />
    </View>
  )
}

export function ImageStyleGrid({
  options,
  selectedStyle,
  onSelectStyle,
}: {
  options: ImageStyleOption[]
  selectedStyle: StyleId
  onSelectStyle: (id: StyleId) => void
}) {
  return (
    <View>
      <Text
        className="mb-4 font-sans-semibold text-[21px] tracking-[-0.5px] text-[#1a1a1a]"
        style={{ fontFamily: 'Inter_600SemiBold' }}
      >
        Select a Style
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {options.map((option) => {
          const selected = option.id === selectedStyle
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelectStyle(option.id)}
              className="mb-5"
              style={{ width: '23%' }}
            >
              <View
                className={`h-[86px] overflow-hidden rounded-[24px] border bg-white ${selected ? 'border-[#f0a15b]' : 'border-white/70'}`}
                style={{
                  shadowColor: selected ? '#f2a25e' : '#f0c2cf',
                  shadowOpacity: selected ? 0.18 : 0.09,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                  elevation: selected ? 6 : 3,
                }}
              >
                <StyleArtwork variant={option.artwork} />
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
