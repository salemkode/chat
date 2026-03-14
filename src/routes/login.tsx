import { SignIn } from '@clerk/clerk-react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect as string | undefined,
  }),
})

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectUrl } = useSearch({ from: '/login' })
  const { isAuthenticated, isLoading } = useConvexAuth()

  const targetAfterLogin =
    redirectUrl && redirectUrl !== '/' ? redirectUrl : '/'

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: targetAfterLogin, replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, targetAfterLogin])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <SignIn />
    </div>
  )
}
