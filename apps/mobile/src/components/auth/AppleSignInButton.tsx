import { useSSO } from '@clerk/expo'
import { useSignInWithApple } from '@clerk/expo/apple'
import { Alert, Platform, Pressable, Text, View } from 'react-native'
import { logClerkError } from '../../lib/clerk-debug'

type AuthErrorLike = {
  code?: string
  message?: string
}

export function AppleSignInButton({ onSignInComplete }: { onSignInComplete?: () => void }) {
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const { startSSOFlow } = useSSO()

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
      Alert.alert(
        'Apple Sign-In Failed',
        authError.message || 'Unable to continue with Apple.'
      )
    }
  }

  return (
    <View>
      <Pressable
        onPress={() => void handleAppleSignIn()}
        className="items-center rounded-[10px] bg-gray-950 py-3.5 active:opacity-75"
      >
        <Text className="text-base font-semibold text-white">Continue with Apple</Text>
      </Pressable>
    </View>
  )
}
