import { useAuth } from '@clerk/react-router'
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect, type ReactNode } from 'react'
import { getRequiredEnv } from '@/lib/parsers'
import { clearLocalOfflineCache } from '@/offline/local-cache'

const convex = new ConvexReactClient(getRequiredEnv(import.meta.env, 'VITE_CONVEX_URL'), {
  expectAuth: true,
})

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexClerkProvider>{children}</ConvexClerkProvider>
}

function ConvexClerkProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken, orgId, orgRole } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn) {
      convex.clearAuth()
      clearLocalOfflineCache()
      return
    }

    const fetchAccessToken = async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        return await getToken({
          template: 'convex',
          skipCache: forceRefreshToken,
        })
      } catch {
        return null
      }
    }

    convex.setAuth(fetchAccessToken)

    return () => {
      convex.clearAuth()
    }
  }, [getToken, isLoaded, isSignedIn, orgId, orgRole])

  return (
    <ConvexProvider client={convex}>
      {/* Keeps idle Convex query subscriptions briefly after unmount for faster navigation; uses more bandwidth than uncached useQuery (see convex-helpers Query Caching docs). */}
      <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
    </ConvexProvider>
  )
}
