import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignIn,
} from '@clerk/react-router'
import { Navigate, useSearchParams } from 'react-router'
import { useEffect } from 'react'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
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
    <>
      <ClerkLoading>
        <AuthLoadingScreen />
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-in">
          <Navigate to={targetAfterLogin} replace />
        </Show>

        <Show when="signed-out">
          {!useExternalAuth ? (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
              <SignIn
                path="/login"
                routing="path"
                signUpUrl="/signup"
                {...redirectProps}
              />
            </div>
          ) : null}
          {useExternalAuth && authFrontendBase ? (
            <ExternalAuthRedirect to={authFrontendBase} />
          ) : null}
        </Show>
      </ClerkLoaded>
    </>
  )
}

function ExternalAuthRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return <AuthLoadingScreen />
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
