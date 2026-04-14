import { Link, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppleSignInButton } from '../../src/components/auth/apple-sign-in-button'
import { GoogleSignInButton } from '../../src/components/auth/google-sign-in-button'

export default function SignInScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View
      className="flex-1 bg-background px-6"
      style={{ paddingTop: Math.max(insets.top, 60), paddingBottom: Math.max(insets.bottom, 20) }}
    >
      <View className="mb-10 mt-12 flex-1 justify-center">
        <Text className="mb-3 text-4xl font-bold text-foreground">Welcome back</Text>
        <Text className="text-lg text-muted">Sign in to continue to your chats.</Text>
      </View>

      <View className="mb-8 w-full">
        <AppleSignInButton onSignInComplete={() => router.replace('/chats')} />
        <GoogleSignInButton onSignInComplete={() => router.replace('/chats')} />
      </View>

      <View className="flex-row justify-center pb-8">
        <Text className="text-muted">Don't have an account? </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Text className="font-semibold text-primary">Sign up</Text>
        </Link>
      </View>
    </View>
  )
}
