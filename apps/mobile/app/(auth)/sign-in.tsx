import { useSignIn } from '@clerk/expo'
import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppleSignInButton } from '../../src/components/auth/AppleSignInButton'
import { GoogleSignInButton } from '../../src/components/auth/GoogleSignInButton'
import { logClerkError } from '../../src/lib/clerk-debug'

export default function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fieldLabelClassName = 'mt-1 text-[14px] font-medium text-gray-700'

  const handleSubmit = async () => {
    setError(null)

    try {
      const { error: signInError } = await signIn.password({
        emailAddress: email.trim(),
        password,
      })

      if (signInError) {
        logClerkError('sign-in password flow failed', signInError)
        setError(signInError.message || 'Failed to sign in.')
        return
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: () => {
            router.replace('/chats')
          },
        })
        return
      }

      if (signIn.status === 'needs_client_trust') {
        const emailCodeFactor = signIn.supportedSecondFactors.find(
          (factor) => factor.strategy === 'email_code'
        )

        if (emailCodeFactor) {
          await signIn.mfa.sendEmailCode()
          return
        }
      }

      logClerkError('sign-in password flow incomplete', {
        status: signIn.status,
        supportedSecondFactors: signIn.supportedSecondFactors,
      })
      setError('Sign in is not complete yet.')
    } catch (err: unknown) {
      logClerkError('sign-in password flow threw', err)
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string; errors?: Array<{ longMessage?: string }> })?.message ||
            (err as { errors?: Array<{ longMessage?: string }> })?.errors?.[0]?.longMessage ||
            'Failed to sign in.'
      setError(message)
    }
  }

  const handleVerify = async () => {
    setError(null)

    try {
      await signIn.mfa.verifyEmailCode({ code })

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: () => {
            router.replace('/chats')
          },
        })
        return
      }

      logClerkError('email verification flow incomplete', {
        status: signIn.status,
      })
      setError('Verification not completed.')
    } catch (err: unknown) {
      logClerkError('email verification flow threw', err)
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string; errors?: Array<{ longMessage?: string }> })?.message ||
            (err as { errors?: Array<{ longMessage?: string }> })?.errors?.[0]?.longMessage ||
            'Failed to verify code.'
      setError(message)
    }
  }

  if (signIn.status === 'needs_client_trust') {
    return (
      <View
        className="flex-1 justify-center gap-3 px-5 pb-5"
        style={{ paddingTop: Math.max(insets.top, 20) }}
      >
        <Text className="text-3xl font-bold">Verify your account</Text>
        <Text className="text-gray-600">Enter the email code we just sent you.</Text>
        <Text className={fieldLabelClassName}>Verification code</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Verification code"
          keyboardType="number-pad"
          className="rounded-[10px] border border-gray-300 px-3 py-2.5"
        />
        {errors.fields.code ? <Text className="text-red-700">{errors.fields.code.message}</Text> : null}
        {error ? <Text className="text-red-700">{error}</Text> : null}
        <Pressable
          onPress={() => void handleVerify()}
          disabled={fetchStatus === 'fetching' || !code}
          className="rounded-[10px] bg-gray-900 py-3 disabled:opacity-50"
        >
          <Text className="text-center font-bold text-white">Verify</Text>
        </Pressable>
        <Pressable onPress={() => void signIn.mfa.sendEmailCode()}>
          <Text className="text-center font-medium text-blue-600">Send a new code</Text>
        </Pressable>
        <Pressable onPress={() => signIn.reset()}>
          <Text className="text-center font-medium text-blue-600">Start over</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View
      className="flex-1 justify-center gap-3 px-5 pb-5"
      style={{ paddingTop: Math.max(insets.top, 20) }}
    >
      <Text className="text-3xl font-bold">Sign In</Text>
      <AppleSignInButton onSignInComplete={() => router.replace('/chats')} />
      <GoogleSignInButton onSignInComplete={() => router.replace('/chats')} />
      <Text className={fieldLabelClassName}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        className="rounded-[10px] border border-gray-300 px-3 py-2.5"
      />
      {errors.fields.identifier ? (
        <Text className="text-red-700">{errors.fields.identifier.message}</Text>
      ) : null}
      <Text className={fieldLabelClassName}>Password</Text>
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
        <Text className="text-center font-bold text-white">Sign in</Text>
      </Pressable>
      <Link href="/(auth)/sign-up" asChild>
        <Pressable>
          <Text className="text-center font-medium text-blue-600">
          Need an account? Sign up
          </Text>
        </Pressable>
      </Link>
    </View>
  )
}
