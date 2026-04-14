import { useSSO } from '@clerk/expo'
import { useSignInWithApple } from '@clerk/expo/apple'
import { Ionicons } from '@expo/vector-icons'
import { Alert, Platform, Pressable, Text } from 'react-native'
import { useCSSVariable } from 'uniwind'
import { logClerkError } from '../../lib/clerk-debug'

type AuthErrorLike = {
  code?: string
  message?: string
}

export function AppleSignInButton({ onSignInComplete }: { onSignInComplete?: () => void }) {
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const { startSSOFlow } = useSSO()
  const iconColor = useCSSVariable('--color-background') as string

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null
  }

  const handleAppleSignIn = async () => {
    try {
      if (Platform.OS === 'ios') {
        const { createdSessionId, setActive } = await startAppleAuthenticationFlow()

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId })
          onSignInComplete?.()
        }

        return
      }

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_apple',
      })

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        onSignInComplete?.()
      }
    } catch (err: unknown) {
      const authError = (err ?? {}) as AuthErrorLike
      if (authError.message?.includes('ERR_REQUEST_CANCELED')) return
      if (authError.code === 'ERR_CANCELED') return
      logClerkError('apple sign-in failed', err)
      Alert.alert('Apple Sign-In Failed', authError.message || 'Unable to continue with Apple.')
    }
  }

  return (
    <Pressable
      onPress={() => void handleAppleSignIn()}
      className="mb-3 flex-row items-center justify-center gap-3 rounded-full bg-foreground py-4 active:opacity-80"
    >
      <Ionicons name="logo-apple" size={20} color={iconColor} />
      <Text className="text-base font-semibold text-background">Continue with Apple</Text>
    </Pressable>
  )
}
