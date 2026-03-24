import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignUp,
} from '@clerk/tanstack-react-start'
import { createFileRoute, Navigate, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'
import { parseRouteSearchRedirects } from '@/lib/parsers'

export const Route = createFileRoute('/signup')({
  ssr: false,
  component: SignupPage,
  validateSearch: parseRouteSearchRedirects,
})

function SignupPage() {
  const search = useSearch({ from: '/signup' })
  const redirect = search.redirect ?? search.redirect_url
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
