import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignIn,
} from '@clerk/react-router'
import { Navigate, useSearchParams } from 'react-router'
import { Loader2 } from '@/lib/icons'
import { useEffect } from 'react'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const hostname = location.hostname
  const isLocalhost = LOCAL_HOSTNAMES.has(hostname)
  const isProduction = import.meta.env.PROD
  const redirect = searchParams.get('redirect') ?? undefined
  const targetAfterLogin = getPostLoginRedirectTarget(redirect)
  const authFrontendBase = resolveAuthFrontendBaseUrl(
    import.meta.env.VITE_AUTH_FRONTEND_URL,
  )
  const useExternalAuth =
    isProduction && !isLocalhost && Boolean(authFrontendBase)
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
          {!useExternalAuth ? (
            <SignIn
              path="/login"
              routing="path"
              signUpUrl="/signup"
              {...redirectProps}
            />
          ) : null}
          {useExternalAuth && authFrontendBase ? (
            <ExternalAuthRedirect to={authFrontendBase} />
          ) : null}
        </Show>
      </ClerkLoaded>
    </div>
  )
}

function ExternalAuthRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Redirecting to sign in...
      </p>
    </div>
  )
}

function resolveAuthFrontendBaseUrl(configuredUrl?: string) {
  if (!configuredUrl) {
    return undefined
  }

  try {
    return new URL(configuredUrl).origin
  } catch {
    return undefined
  }
}
