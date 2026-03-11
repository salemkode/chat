import { SignIn } from '@clerk/clerk-react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { useOfflineStatus } from '@/offline/repositories'

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
  const { isOnline } = useOfflineStatus()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: redirectUrl || '/chat' })
    }
  }, [isAuthenticated, isLoading, navigate, redirectUrl])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {isOnline ? (
        <SignIn />
      ) : (
        <div className="max-w-md text-center space-y-3">
          <WifiOff className="mx-auto size-8 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Internet connection required</h1>
          <p className="text-sm text-muted-foreground">
            Sign in once while online to unlock offline access on this device.
          </p>
        </div>
      )}
    </div>
  )
}
