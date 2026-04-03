import { Ionicons } from '@expo/vector-icons'
import { useAuth, useClerk, useUser } from '@clerk/expo'
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition'
import { Link, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useState } from 'react'
import { useUserSettings } from '../../mobile-data/use-user-settings'

export function ProfilePanel({
  showBackButton,
  onOpenProjects,
  onBack,
}: {
  showBackButton?: boolean
  onOpenProjects?: () => void
  onBack?: () => void
}) {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { isUpdatingVoiceMode, setVoiceTranscriptionMode, voiceTranscriptionMode } =
    useUserSettings()
  const [voiceSettingsError, setVoiceSettingsError] = useState<string | null>(null)
  const isDark = colorScheme === 'dark'
  const foregroundColor = isDark ? '#f5f5f5' : '#111827'
  const mutedColor = isDark ? '#9a9ca3' : '#6b7280'
  const iconDisabledColor = isDark ? '#5b5d63' : '#d1d5db'
  const dangerColor = isDark ? '#eaa3af' : '#dc2626'
  const deviceVoiceSupported =
    ExpoSpeechRecognitionModule.isRecognitionAvailable() &&
    ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-10">
        <ActivityIndicator colorClassName="accent-primary" />
      </View>
    )
  }

  if (!isSignedIn) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text
          className="mb-4 text-center text-[17px] text-foreground-secondary"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          You are signed out.
        </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="rounded-full bg-white px-8 py-3.5 active:opacity-90">
            <Text
              className="text-center text-[17px] text-black"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Go to sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    )
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    'Account'
  const email = user?.emailAddresses.find((e) => e.emailAddress)?.emailAddress

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-border-subtle px-4 py-3">
        {showBackButton ? (
          <Pressable
            onPress={onBack}
            className="size-10 items-center justify-center rounded-full active:bg-card"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color={foregroundColor} />
          </Pressable>
        ) : (
          <View className="size-10" />
        )}
        <Text
          className="text-[17px] text-foreground"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Account
        </Text>
        <View className="size-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 items-center">
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              className="size-24 rounded-full border border-border"
            />
          ) : (
            <View className="size-24 items-center justify-center rounded-full border border-border bg-elevated">
              <Ionicons name="person" size={48} color={mutedColor} />
            </View>
          )}
          <Text
            className="mt-4 text-center text-[22px] text-foreground"
            style={{ fontFamily: 'Inter_600SemiBold' }}
          >
            {displayName}
          </Text>
          {email ? (
            <Text className="mt-1 text-center font-sans text-[15px] text-foreground-secondary">
              {email}
            </Text>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <Pressable
            className="flex-row items-center justify-between border-b border-border-subtle px-4 py-4 active:bg-elevated"
            onPress={() => {
              if (onOpenProjects) {
                onOpenProjects()
              } else {
                router.push('/chats?tab=projects')
              }
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-full bg-elevated">
                <Ionicons name="folder-open-outline" size={20} color={foregroundColor} />
              </View>
              <Text
                className="text-[17px] text-foreground"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                Projects
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={iconDisabledColor} />
          </Pressable>

          <View className="border-b border-border-subtle px-4 py-4">
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-full bg-elevated">
                <Ionicons name="mic-outline" size={20} color={foregroundColor} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-[17px] text-foreground"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Voice transcription
                </Text>
                <Text className="mt-1 font-sans text-[13px] text-foreground-secondary">
                  {deviceVoiceSupported
                    ? 'Choose between cloud transcription and on-device recognition.'
                    : 'On-device recognition is unavailable on this device. Cloud remains available.'}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              <Pressable
                className={`flex-1 rounded-full px-4 py-3 ${
                  voiceTranscriptionMode === 'cloud' ? 'bg-white' : 'bg-elevated'
                }`}
                disabled={isUpdatingVoiceMode}
                onPress={() => {
                  setVoiceSettingsError(null)
                  void setVoiceTranscriptionMode('cloud').catch((error) => {
                    setVoiceSettingsError(
                      error instanceof Error
                        ? error.message
                        : 'Failed to update voice transcription mode.',
                    )
                  })
                }}
              >
                <Text
                  className={`text-center text-[15px] ${
                    voiceTranscriptionMode === 'cloud'
                      ? 'text-black'
                      : 'text-foreground'
                  }`}
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Cloud
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-full px-4 py-3 ${
                  voiceTranscriptionMode === 'device' ? 'bg-white' : 'bg-elevated'
                }`}
                disabled={isUpdatingVoiceMode || !deviceVoiceSupported}
                onPress={() => {
                  if (!deviceVoiceSupported) {
                    return
                  }
                  setVoiceSettingsError(null)
                  void setVoiceTranscriptionMode('device').catch((error) => {
                    setVoiceSettingsError(
                      error instanceof Error
                        ? error.message
                        : 'Failed to update voice transcription mode.',
                    )
                  })
                }}
                style={{ opacity: !deviceVoiceSupported ? 0.45 : 1 }}
              >
                <Text
                  className={`text-center text-[15px] ${
                    voiceTranscriptionMode === 'device'
                      ? 'text-black'
                      : 'text-foreground'
                  }`}
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  On-device
                </Text>
              </Pressable>
            </View>

            {voiceSettingsError ? (
              <Text className="mt-3 text-[13px] text-danger" style={{ fontFamily: 'Inter_400Regular' }}>
                {voiceSettingsError}
              </Text>
            ) : null}
          </View>

          <Pressable
            className="flex-row items-center gap-3 px-4 py-4 active:bg-elevated"
            onPress={() => void signOut()}
          >
            <View className="size-9 items-center justify-center rounded-full bg-danger-surface">
              <Ionicons name="log-out-outline" size={20} color={dangerColor} />
            </View>
            <Text className="text-[17px] text-danger" style={{ fontFamily: 'Inter_500Medium' }}>
              Sign out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
