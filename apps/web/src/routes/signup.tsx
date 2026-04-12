import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignUp,
} from '@clerk/react-router'
import { Navigate, useSearchParams } from 'react-router'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export default function SignupPage() {
  const [searchParams] = useSearchParams()
  const redirect =
    searchParams.get('redirect') ?? searchParams.get('redirect_url') ?? undefined
  const targetAfterSignup = getPostLoginRedirectTarget(redirect)
  const redirectProps = redirect
    ? {
        forceRedirectUrl: targetAfterSignup,
        signInForceRedirectUrl: targetAfterSignup,
      }
    : {
        fallbackRedirectUrl: '/',
        signInFallbackRedirectUrl: '/',
      }

  return (
    <>
      <ClerkLoading>
        <AuthLoadingScreen />
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-in">
          <Navigate to={targetAfterSignup} replace />
        </Show>

        <Show when="signed-out">
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <SignUp
              path="/signup"
              routing="path"
              signInUrl="/login"
              {...redirectProps}
            />
          </div>
        </Show>
      </ClerkLoaded>
    </>
  )
}
