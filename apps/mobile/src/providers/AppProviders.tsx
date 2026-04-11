import { ClerkProvider, useAuth } from '@clerk/expo'
import { resourceCache } from '@clerk/expo/resource-cache'
import { tokenCache } from '@clerk/expo/token-cache'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { PropsWithChildren } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { mobileEnv } from '../lib/env'

const convexClient = new ConvexReactClient(mobileEnv.convexUrl, {
  expectAuth: true,
})

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ClerkProvider
      publishableKey={mobileEnv.clerkPublishableKey}
      tokenCache={tokenCache}
      __experimental_resourceCache={resourceCache}
    >
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
