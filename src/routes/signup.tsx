import { SignUp } from '@clerk/clerk-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { useOfflineStatus } from '@/offline/repositories'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { isOnline } = useOfflineStatus()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void navigate({ to: '/chat' })
    }
  }, [isAuthenticated, isLoading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {isOnline ? (
        <SignUp />
      ) : (
        <div className="max-w-md text-center space-y-3">
          <WifiOff className="mx-auto size-8 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Internet connection required</h1>
          <p className="text-sm text-muted-foreground">
            Create your account online first, then this device can use cached chats offline.
          </p>
        </div>
      )}
    </div>
  )
}
