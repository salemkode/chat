import { AuthenticateWithRedirectCallback } from '@clerk/react-router'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function SsoCallbackPage() {
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
        signInUrl="/login"
        signUpUrl="/signup"
        signInForceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
      />
      <AuthLoadingScreen />
    </>
  )
}
