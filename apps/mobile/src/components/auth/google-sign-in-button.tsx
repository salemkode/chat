import { useSSO } from '@clerk/expo'
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native'
import { logClerkError } from '../../lib/clerk-debug'

type AuthErrorLike = {
  code?: string
  message?: string
}

interface GoogleSignInButtonProps {
  onSignInComplete?: () => void
  showDivider?: boolean
}

export function GoogleSignInButton({
  onSignInComplete,
  showDivider = true,
}: GoogleSignInButtonProps) {
  const { startSSOFlow } = useSSO()

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null
  }

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
      })

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId })
        onSignInComplete?.()
      }
    } catch (err: unknown) {
      const authError = (err ?? {}) as AuthErrorLike
      if (authError.code === 'SIGN_IN_CANCELLED' || authError.code === '-5') return
      logClerkError('google sign-in failed', err)
      Alert.alert('Google Sign-In Failed', authError.message || 'Unable to continue with Google.')
    }
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => void handleGoogleSignIn()}
        className="items-center rounded-[10px] bg-blue-500 py-3.5"
      >
        <Text className="text-base font-semibold text-white">Continue with Google</Text>
      </TouchableOpacity>
      {showDivider ? (
        <View className="my-3 flex-row items-center">
          <View className="h-px flex-1 bg-gray-300" />
          <Text className="mx-2 text-xs font-semibold text-gray-500">OR</Text>
          <View className="h-px flex-1 bg-gray-300" />
        </View>
      ) : null}
    </>
  )
}
