import { useAuth, useSignUp } from '@clerk/expo'
import { Link, Redirect, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppleSignInButton } from '../../src/components/auth/apple-sign-in-button'
import { GoogleSignInButton } from '../../src/components/auth/google-sign-in-button'
import { logClerkError } from '../../src/lib/clerk-debug'
import { useAuthFlowStore } from '../../src/store/auth-flow'

export default function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const setPendingEmail = useAuthFlowStore((state) => state.setPendingEmail)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)

    try {
      const { error: signUpError } = await signUp.password({
        emailAddress: email.trim(),
        password,
      })

      if (signUpError) {
        logClerkError('sign-up password flow failed', signUpError)
        setError(signUpError.message || 'Failed to sign up.')
        return
      }

      await signUp.verifications.sendEmailCode()
      setPendingEmail(email.trim())
      router.push('/(auth)/verify-email')
    } catch (err: unknown) {
      logClerkError('sign-up password flow threw', err)
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string; errors?: Array<{ longMessage?: string }> })?.message ||
            (err as { errors?: Array<{ longMessage?: string }> })?.errors?.[0]?.longMessage ||
            'Failed to sign up.'
      setError(message)
    }
  }

  if (isSignedIn || signUp.status === 'complete') {
    return <Redirect href="/chats" />
  }

  return (
    <View
      className="flex-1 justify-center gap-3 px-5 pb-5"
      style={{ paddingTop: Math.max(insets.top, 20) }}
    >
      <Text className="text-3xl font-bold">Sign Up</Text>
      <AppleSignInButton onSignInComplete={() => router.replace('/chats')} />
      <GoogleSignInButton onSignInComplete={() => router.replace('/chats')} />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        className="rounded-[10px] border border-gray-300 px-3 py-2.5"
      />
      {errors.fields.emailAddress ? (
        <Text className="text-red-700">{errors.fields.emailAddress.message}</Text>
      ) : null}
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        className="rounded-[10px] border border-gray-300 px-3 py-2.5"
      />
      {errors.fields.password ? (
        <Text className="text-red-700">{errors.fields.password.message}</Text>
      ) : null}
      {error ? <Text className="text-red-700">{error}</Text> : null}
      <Pressable
        onPress={() => void handleSubmit()}
        disabled={fetchStatus === 'fetching' || !email || !password}
        className="rounded-[10px] bg-gray-900 py-3 disabled:opacity-50"
      >
        <Text className="text-center font-bold text-white">Create account</Text>
      </Pressable>
      <Link href="/(auth)/sign-in" asChild>
        <Pressable>
          <Text className="text-center font-medium text-blue-600">
            Already have an account? Sign in
          </Text>
        </Pressable>
      </Link>
      <View nativeID="clerk-captcha" />
    </View>
  )
}
