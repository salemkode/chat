import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { useNavigate } from '@tanstack/react-router'
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useEffect, type ReactNode } from 'react'
import { getRequiredEnv, toTypedRouteSearch } from '@/lib/parsers'

const convex = new ConvexReactClient(getRequiredEnv(import.meta.env, 'VITE_CONVEX_URL'), {
  expectAuth: true,
})
const clerkPublishableKey = getRequiredEnv(
  import.meta.env,
  'VITE_CLERK_PUBLISHABLE_KEY',
)

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkWithRouterProvider publishableKey={clerkPublishableKey}>
      {children}
    </ClerkWithRouterProvider>
  )
}

function ClerkWithRouterProvider({
  children,
  publishableKey,
}: {
  children: ReactNode
  publishableKey: string
}) {
  const navigate = useNavigate()

  function navigateToClerkUrl(to: string, replace: boolean) {
    const url = new URL(to, window.location.origin)
    const search = Object.fromEntries(url.searchParams.entries())

    return navigate({
      to: url.pathname,
      search: toTypedRouteSearch(search),
      hash: url.hash ? url.hash.slice(1) : undefined,
      replace,
    })
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      routerPush={(to) => navigateToClerkUrl(to, false)}
      routerReplace={(to) => navigateToClerkUrl(to, true)}
    >
      <ConvexClerkProvider>{children}</ConvexClerkProvider>
    </ClerkProvider>
  )
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
