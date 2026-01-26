import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { MessageSquare } from 'lucide-react'

import { SignupForm } from '@/components/signup-form'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthActions()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const name = formData.get('name')
    const email = formData.get('email')
    const password = formData.get('password')
    const confirmPassword = formData.get('confirmPassword')

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      setError('Invalid form data')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    try {
      await signIn('password', { flow: 'signUp', name, email, password })
      void navigate({ to: '/chat' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.')
    } finally {
      setIsLoading(false)
    }
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
            <SignupForm
              onSubmit={(e) => {
                void handleSubmit(e)
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
          <h2 className="text-4xl font-bold text-white mb-4">Join ChatApp</h2>
          <p className="text-white/80 text-lg">
            Create your account and start chatting with AI
          </p>
        </div>
      </div>
    </div>
  )
}
