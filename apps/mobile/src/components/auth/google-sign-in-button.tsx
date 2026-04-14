import { useSSO } from '@clerk/expo'
import { Ionicons } from '@expo/vector-icons'
import { Alert, Platform, Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'
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
  showDivider = false,
}: GoogleSignInButtonProps) {
  const { startSSOFlow } = useSSO()
  const iconColor = useCSSVariable('--color-foreground') as string

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
    <View>
      {showDivider ? (
        <View className="mb-4 mt-2 flex-row items-center">
          <View className="h-px flex-1 bg-border" />
          <Text className="mx-4 text-sm font-medium text-muted">OR</Text>
          <View className="h-px flex-1 bg-border" />
        </View>
      ) : null}
      <Pressable
        onPress={() => void handleGoogleSignIn()}
        className="mb-3 flex-row items-center justify-center gap-3 rounded-full border border-border bg-card py-4 active:opacity-70"
      >
        <Ionicons name="logo-google" size={18} color={iconColor} />
        <Text className="text-base font-semibold text-foreground">Continue with Google</Text>
      </Pressable>
    </View>
  )
}
