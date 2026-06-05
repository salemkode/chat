import { AuthenticateWithRedirectCallback } from '@clerk/react-router'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { AUTH_ROUTE_PATH, AUTH_SIGN_UP_URL, getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export function AuthSsoCallbackPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const redirectUrl = getPostLoginRedirectTarget(
    searchParams.get('sign_in_force_redirect_url') ||
      searchParams.get('sign_up_force_redirect_url') ||
      searchParams.get('redirect') ||
      searchParams.get('redirect_url') ||
      '/',
  )

  return (
    <>
      <AuthenticateWithRedirectCallback
        signInUrl={AUTH_ROUTE_PATH}
        signUpUrl={AUTH_SIGN_UP_URL}
        signInForceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
      />
      <AuthLoadingScreen />
    </>
  )
}
