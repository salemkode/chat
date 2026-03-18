import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignIn,
} from '@clerk/tanstack-react-start'
import { createFileRoute, Navigate, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'
import { parseRouteSearchRedirects } from '@/lib/parsers'

const DEFAULT_AUTH_FRONTEND_URL = 'https://accountist.salincode.com'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

export const Route = createFileRoute('/login')({
  ssr: false,
  component: LoginPage,
  validateSearch: parseRouteSearchRedirects,
})

function LoginPage() {
  const hostname = location.hostname
  const isLocalhost = LOCAL_HOSTNAMES.has(hostname)
  const search = useSearch({ from: '/login' })
  const redirect = search.redirect
  const targetAfterLogin = getPostLoginRedirectTarget(redirect)
  const authFrontendBase = resolveAuthFrontendBaseUrl(
    import.meta.env.VITE_AUTH_FRONTEND_URL,
  )
  const authLoginUrl = new URL('/login', authFrontendBase)
  authLoginUrl.searchParams.set('redirect', targetAfterLogin)
  authLoginUrl.searchParams.set(
    'redirect_url',
    `${location.origin}${targetAfterLogin}`,
  )
  const redirectProps = redirect
    ? {
        forceRedirectUrl: targetAfterLogin,
        signUpForceRedirectUrl: targetAfterLogin,
      }
    : {
        fallbackRedirectUrl: '/',
        signUpFallbackRedirectUrl: '/',
      }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ClerkLoading>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-in">
          <Navigate to={targetAfterLogin} replace />
        </Show>

        <Show when="signed-out">
          {isLocalhost && (
            <SignIn
              path="/login"
              routing="path"
              signUpUrl="/signup"
              {...redirectProps}
            />
          )}
          {!isLocalhost && (
            <Navigate to={authLoginUrl.toString()} replace />
          )}
        </Show>
      </ClerkLoaded>
    </div>
  )
}

function resolveAuthFrontendBaseUrl(configuredUrl?: string) {
  if (!configuredUrl) {
    return DEFAULT_AUTH_FRONTEND_URL
  }

  try {
    return new URL(configuredUrl).origin
  } catch {
    return DEFAULT_AUTH_FRONTEND_URL
  }
}
