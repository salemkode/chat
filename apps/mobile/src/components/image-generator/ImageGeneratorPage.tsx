import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { pickImageAttachments, type LocalAsset } from '../../mobile-data/attachments'
import { GeneratedConceptList } from './GeneratedConceptList'
import { ImageGeneratorHeader } from './ImageGeneratorHeader'
import { ImagePromptCard } from './ImagePromptCard'
import { ImageRatioPicker } from './ImageRatioPicker'
import { ImageStyleGrid } from './ImageStyleGrid'
import { IMAGE_RATIO_OPTIONS, IMAGE_STYLE_OPTIONS } from './presets'
import type { GeneratedConcept, RatioId, StyleId } from './types'

function formatSectionDate() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
}

function formatConceptDate() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
}

export function ImageGeneratorPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('Create an image of a luminous sky garden above a calm city')
  const [attachments, setAttachments] = useState<LocalAsset[]>([])
  const [selectedRatio, setSelectedRatio] = useState<RatioId>('square')
  const [selectedStyle, setSelectedStyle] = useState<StyleId>('realistic')
  const [concepts, setConcepts] = useState<GeneratedConcept[]>([])

  const selectedRatioOption =
    IMAGE_RATIO_OPTIONS.find((option) => option.id === selectedRatio) ?? IMAGE_RATIO_OPTIONS[0]
  const selectedStyleOption =
    IMAGE_STYLE_OPTIONS.find((option) => option.id === selectedStyle) ?? IMAGE_STYLE_OPTIONS[1]

  const handlePickPhoto = async () => {
    const picked = await pickImageAttachments()
    if (!picked.length) {
      return
    }

    setAttachments((current) => {
      const next = [...current]
      for (const asset of picked) {
        if (!next.some((entry) => entry.uri === asset.uri)) {
          next.push(asset)
        }
      }
      return next.slice(0, 4)
    })
  }

  const handleGenerate = () => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      Alert.alert('Prompt required', 'Enter a prompt before generating an image.')
      return
    }

    const concept: GeneratedConcept = {
      id: `${Date.now()}`,
      prompt: trimmedPrompt,
      ratioLabel: selectedRatioOption.label,
      styleLabel: selectedStyleOption.label,
      createdAt: formatConceptDate(),
      attachments,
    }

    setConcepts((current) => [concept, ...current].slice(0, 3))
  }

  return (
    <SafeAreaView className="flex-1 bg-[#fff8f5]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 bg-[#fff8f5]">
          <View className="absolute -left-10 top-14 h-[220px] w-[220px] rounded-full bg-[#ffc8b3]/60" />
          <View className="absolute right-[-42px] top-[240px] h-[260px] w-[260px] rounded-full bg-[#f0a6ff]/40" />
          <View className="absolute bottom-[120px] left-[-18px] h-[210px] w-[210px] rounded-full bg-[#ffbf91]/45" />
          <View className="absolute bottom-0 right-8 h-[170px] w-[170px] rounded-full bg-[#ffd8ce]/50" />

          <ImageGeneratorHeader
            onBack={() => {
              if (router.canGoBack()) {
                router.back()
                return
              }
              router.replace('/chats')
            }}
            onMorePress={() => {
              Alert.alert(
                'Image Generator',
                'This screen is wired for UI exploration. Connect it to your generation backend next.',
              )
            }}
          />

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 36, paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ImagePromptCard
              prompt={prompt}
              onChangePrompt={setPrompt}
              attachments={attachments}
              onPickPhoto={() => {
                void handlePickPhoto()
              }}
              onRemoveAttachment={(uri) => {
                setAttachments((current) => current.filter((attachment) => attachment.uri !== uri))
              }}
              onGenerate={handleGenerate}
              generateDisabled={!prompt.trim()}
            />

            <View className="my-6 flex-row items-center gap-4">
              <View className="h-px flex-1 bg-white/80" />
              <Text className="font-sans text-[15px] text-[#b18b92]">{formatSectionDate()}</Text>
              <View className="h-px flex-1 bg-white/80" />
            </View>

            <ImageRatioPicker
              options={IMAGE_RATIO_OPTIONS}
              selectedRatio={selectedRatio}
              onSelectRatio={setSelectedRatio}
            />

            <View className="mt-2">
              <ImageStyleGrid
                options={IMAGE_STYLE_OPTIONS}
                selectedStyle={selectedStyle}
                onSelectStyle={setSelectedStyle}
              />
            </View>

            <View className="mt-1">
              <GeneratedConceptList concepts={concepts} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
