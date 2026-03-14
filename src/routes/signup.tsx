import {
  ClerkLoaded,
  ClerkLoading,
  SignUp,
  SignedIn,
  SignedOut,
} from '@clerk/clerk-react'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <ClerkLoading>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </ClerkLoading>

      <ClerkLoaded>
        <SignedIn>
          <Navigate to="/" replace />
        </SignedIn>

        <SignedOut>
          <SignUp
            path="/signup"
            routing="path"
            signInUrl="/login"
            fallbackRedirectUrl="/"
          />
        </SignedOut>
      </ClerkLoaded>
    </div>
  )
}
