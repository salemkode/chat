import { useAuth } from '@clerk/tanstack-react-start'
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect, type ReactNode } from 'react'
import { getRequiredEnv } from '@/lib/parsers'

const convex = new ConvexReactClient(
  getRequiredEnv(import.meta.env, 'VITE_CONVEX_URL'),
  {
    expectAuth: true,
  },
)

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
      return
    }

    const fetchAccessToken = async ({
      forceRefreshToken,
    }: {
      forceRefreshToken: boolean
    }) => {
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
      <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
    </ConvexProvider>
  )
}
