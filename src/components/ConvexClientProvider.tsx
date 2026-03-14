import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { useNavigate } from '@tanstack/react-router'
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import type { ReactNode } from 'react'

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
  {
    expectAuth: true,
  },
)
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!clerkPublishableKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable')
  }

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
      search: Object.keys(search).length > 0 ? (search as never) : undefined,
      hash: url.hash ? url.hash.slice(1) : undefined,
      replace,
    })
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/login"
      signUpUrl="/signup"
      routerPush={(to) => navigateToClerkUrl(to, false)}
      routerReplace={(to) => navigateToClerkUrl(to, true)}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
