import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, Text, TextInput, View } from 'react-native'
import type { LocalAsset } from '../../mobile-data/attachments'

export function ImagePromptCard({
  prompt,
  onChangePrompt,
  attachments,
  onPickPhoto,
  onRemoveAttachment,
  onGenerate,
  generateDisabled,
}: {
  prompt: string
  onChangePrompt: (value: string) => void
  attachments: LocalAsset[]
  onPickPhoto: () => void
  onRemoveAttachment: (uri: string) => void
  onGenerate: () => void
  generateDisabled: boolean
}) {
  return (
    <View
      className="relative overflow-hidden rounded-[34px] border border-[#f3a14b] bg-white px-5 pb-5 pt-5"
      style={{
        shadowColor: '#f0a063',
        shadowOpacity: 0.16,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 18 },
        elevation: 8,
      }}
    >
      <View className="absolute left-12 right-16 top-0 h-[1.5px] rounded-full bg-[#cdd97b]" />
      <View className="absolute bottom-0 left-20 right-5 h-[1.5px] rounded-full bg-[#51e6dc]" />
      <View className="absolute bottom-5 right-0 top-14 w-[1.5px] rounded-full bg-[#51e6dc]" />

      <TextInput
        value={prompt}
        onChangeText={onChangePrompt}
        multiline
        textAlignVertical="top"
        placeholder="Create an image of a glass atrium filled with floating lanterns..."
        placeholderTextColor="#cfc3c6"
        className="min-h-[136px] font-sans text-[20px] leading-[30px] tracking-[-0.5px] text-[#212121]"
        style={{ fontFamily: 'Inter_400Regular' }}
      />

      {attachments.length ? (
        <View className="mb-4 flex-row flex-wrap gap-3">
          {attachments.map((attachment) => (
            <View
              key={attachment.uri}
              className="relative h-[70px] w-[70px] overflow-hidden rounded-[22px] border border-white bg-[#f8f1ed]"
            >
              <Image source={{ uri: attachment.uri }} className="h-full w-full" resizeMode="cover" />
              <Pressable
                onPress={() => onRemoveAttachment(attachment.uri)}
                accessibilityLabel={`Remove ${attachment.name}`}
                className="absolute right-1.5 top-1.5 size-6 items-center justify-center rounded-full bg-black/55 active:opacity-80"
              >
                <Ionicons name="close" size={14} color="#ffffff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          onPress={onPickPhoto}
          className="flex-row items-center gap-2 rounded-full bg-[#faf6f0] px-4 py-3 active:opacity-80"
        >
          <Ionicons name="image-outline" size={19} color="#535353" />
          <Text className="font-sans-medium text-[16px] text-[#4e4e4e]">Add Photo</Text>
        </Pressable>

        <Pressable
          onPress={onGenerate}
          disabled={generateDisabled}
          className={`min-w-[154px] flex-row items-center justify-center gap-2 rounded-full px-6 py-3.5 ${generateDisabled ? 'bg-[#f4c9a9]' : 'bg-[#ff8f4a]'}`}
          style={{
            shadowColor: '#ff9748',
            shadowOpacity: generateDisabled ? 0 : 0.28,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: generateDisabled ? 0 : 6,
          }}
        >
          <Ionicons name="sparkles-outline" size={18} color="#fff8f2" />
          <Text className="font-sans-semibold text-[18px] text-[#fff8f2]">Generate</Text>
        </Pressable>
      </View>
    </View>
  )
}
