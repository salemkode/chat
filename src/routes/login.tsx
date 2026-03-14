import {
  ClerkLoaded,
  ClerkLoading,
  SignIn,
  SignedIn,
  SignedOut,
} from '@clerk/clerk-react'
import { createFileRoute, Navigate, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { getPostLoginRedirectTarget } from '@/lib/auth-redirect'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect as string | undefined,
  }),
})

function LoginPage() {
  const { redirect: redirectUrl } = useSearch({ from: '/login' })
  const targetAfterLogin = getPostLoginRedirectTarget(redirectUrl)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ClerkLoading>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </ClerkLoading>

      <ClerkLoaded>
        <SignedIn>
          <Navigate to={targetAfterLogin} replace />
        </SignedIn>

        <SignedOut>
          <SignIn
            path="/login"
            routing="path"
            signUpUrl="/signup"
            fallbackRedirectUrl="/"
            forceRedirectUrl={redirectUrl ? targetAfterLogin : undefined}
          />
        </SignedOut>
      </ClerkLoaded>
    </div>
  )
}
