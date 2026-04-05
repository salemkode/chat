import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignUp,
} from '@clerk/react-router'
import { Navigate, useSearchParams } from 'react-router'
import { Loader2 } from '@/lib/icons'
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ClerkLoading>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-in">
          <Navigate to={targetAfterSignup} replace />
        </Show>

        <Show when="signed-out">
          <SignUp
            path="/signup"
            routing="path"
            signInUrl="/login"
            {...redirectProps}
          />
        </Show>
      </ClerkLoaded>
    </div>
  )
}
