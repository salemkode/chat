import { Ionicons } from '@expo/vector-icons'
import { useAuth, useClerk, useUser } from '@clerk/expo'
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

export default function ProfileTabScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const isDark = colorScheme === 'dark'
  const foregroundColor = isDark ? '#f5f5f5' : '#111827'
  const mutedColor = isDark ? '#9a9ca3' : '#6b7280'
  const iconDisabledColor = isDark ? '#5b5d63' : '#d1d5db'
  const dangerColor = isDark ? '#eaa3af' : '#dc2626'

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
    'Account';
  const email = user?.emailAddresses.find(e => e.emailAddress)?.emailAddress;
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-border-subtle px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full active:bg-card"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={foregroundColor} />
        </Pressable>
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
        <Text className="text-foreground-secondary border border-red-600">
          {JSON.stringify(user, null, 2)}
        </Text>
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
            <Text className="mt-1 text-center font-sans text-[15px] text-foreground-secondary border border-red-600">
              {email}
            </Text>
          ) : null}
        </View>

        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <Pressable
            className="flex-row items-center justify-between border-b border-border-subtle px-4 py-4 active:bg-elevated"
            onPress={() => router.push('/projects')}
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

          <Pressable
            className="flex-row items-center gap-3 px-4 py-4 active:bg-elevated"
            onPress={() => void signOut()}
          >
            <View className="size-9 items-center justify-center rounded-full bg-danger-surface">
              <Ionicons name="log-out-outline" size={20} color={dangerColor} />
            </View>
            <Text
              className="text-[17px] text-danger"
              style={{ fontFamily: 'Inter_500Medium' }}
            >
              Sign out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
