import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import React from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { Loader2, MessageSquare } from 'lucide-react'

import { LoginForm } from '@/components/login-form'
import { useConvexAuth } from 'convex/react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect as string | undefined,
  }),
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectUrl } = useSearch({ from: '/login' })
  const { signIn } = useAuthActions()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await signIn('password', { email, password, flow: 'signIn' })
      setIsLoading(false)
      // Redirect to the original page or default to /chat
      if (redirectUrl) {
        void navigate({ to: redirectUrl })
      } else {
        void navigate({ to: '/chat' })
      }
    } catch (err) {
      setIsLoading(false)
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    }
  }

  if (isAuthLoading) {
    return <div className="flex items-center justify-center h-screen">
      <Loader2 className="size-4 animate-spin" />
    </div>
  }

  if (isAuthenticated) {
    void navigate({ to: redirectUrl || '/chat' })
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-blue-600 text-white flex size-6 items-center justify-center rounded-md">
              <MessageSquare className="size-4" />
            </div>
            ChatApp
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm
              onSubmit={(event) => {
                void handleSubmit(event)
              }}
              errorMessage={error}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent" />
        <img
          src="https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80"
          alt="Abstract gradient background"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
        <div className="relative z-10 text-center px-8">
          <h2 className="text-4xl font-bold text-white mb-4">Welcome Back</h2>
          <p className="text-white/80 text-lg">
            Sign in to continue to your AI-powered chat experience
          </p>
        </div>
      </div>
    </div>
  )
}
