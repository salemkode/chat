import { useAuth } from '@clerk/expo'
import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useClerkLoadDebug } from '../src/lib/clerk-debug'

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  useClerkLoadDebug('Root index', isLoaded)

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return <Redirect href="/chats" />
}
