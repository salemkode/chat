import { useSignUp } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthFlowStore } from '../../src/store/auth-flow'

export default function VerifyEmailScreen() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const pendingEmail = useAuthFlowStore((state) => state.pendingEmail)
  const setPendingEmail = useAuthFlowStore((state) => state.setPendingEmail)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    setError(null)

    try {
      await signUp.verifications.verifyEmailCode({ code })

      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: () => {
            setPendingEmail(null)
            router.replace('/chats')
          },
        })
        return
      }

      setError('Verification not completed.')
    } catch (err: any) {
      setError(err?.message || err?.errors?.[0]?.longMessage || 'Failed to verify code.')
    }
  }

  return (
    <View
      className="flex-1 justify-center gap-3 px-5 pb-5"
      style={{ paddingTop: Math.max(insets.top, 20) }}
    >
      <Text className="text-3xl font-bold">Verify Email</Text>
      <Text className="text-gray-600">
        Enter the code sent to {pendingEmail || 'your email'}.
      </Text>
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
      <Pressable onPress={() => void signUp.verifications.sendEmailCode()}>
        <Text className="text-center font-medium text-blue-600">Send a new code</Text>
      </Pressable>
      <View nativeID="clerk-captcha" />
    </View>
  )
}
