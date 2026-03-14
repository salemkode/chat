import {
  ClerkLoaded,
  ClerkLoading,
  SignUp,
  SignedIn,
  SignedOut,
} from '@clerk/clerk-react'
import { createFileRoute, Navigate, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect as string | undefined,
    redirect_url: search.redirect_url as string | undefined,
  }),
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
        <SignedIn>
          <Navigate to={targetAfterSignup} replace />
        </SignedIn>

        <SignedOut>
          <SignUp
            path="/signup"
            routing="path"
            signInUrl="/login"
            {...redirectProps}
          />
        </SignedOut>
      </ClerkLoaded>
    </div>
  )
}
