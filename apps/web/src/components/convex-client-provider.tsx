import { useAuth } from '@clerk/react-router'
import { ConvexQueryCacheProvider } from '@chat/core/convex-query-cache/provider'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useEffect, type ReactNode } from 'react'
import { getRequiredEnv } from '@/lib/parsers'
import { clearLocalOfflineCache } from '@/offline/local-cache'

const convex = new ConvexReactClient(getRequiredEnv(import.meta.env, 'VITE_CONVEX_URL'), {
  expectAuth: true,
})

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      clearLocalOfflineCache()
    }
  }, [isLoaded, isSignedIn])

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {/* Keeps idle Convex query subscriptions briefly after unmount for faster navigation; uses more bandwidth than uncached useQuery. */}
      <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
    </ConvexProviderWithClerk>
  )
}
