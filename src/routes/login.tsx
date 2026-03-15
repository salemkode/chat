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

export const Route = createFileRoute('/login')({
  ssr: false,
  component: LoginPage,
  //validateSearch: parseRouteSearchRedirects,
})

function LoginPage() {
  const search = useSearch({ from: '/login' })
  const redirect = search.redirect ?? search.redirect_url
  const targetAfterLogin = getPostLoginRedirectTarget(redirect)
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
          <SignIn
            path="/login"
            routing="path"
            signUpUrl="/signup"
            {...redirectProps}
          />
        </Show>
      </ClerkLoaded>
    </div>
  )
}
