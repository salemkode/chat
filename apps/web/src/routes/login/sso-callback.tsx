import { ClerkLoaded, useClerk, useSignIn } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/login/sso-callback')({
  ssr: false,
  component: SsoCallbackPage,
})

function SsoCallbackPage() {
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const navigate = useNavigate()

  const handleRedirect = async () => {
    const searchParams = new URLSearchParams(window.location.search)
    const redirectUrl =
      searchParams.get('sign_in_force_redirect_url') ||
      searchParams.get('sign_up_force_redirect_url') ||
      searchParams.get('redirect') ||
      searchParams.get('redirect_url') ||
      '/'

    try {
      if (signIn?.status === 'complete') {
        await signIn.finalize({
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              return
            }
          },
        })
      }

      navigate({ to: redirectUrl })
    } catch (error) {
      console.error('SSO callback error:', error)
      navigate({ to: '/login' })
    }
  }

  useEffect(() => {
    if (clerk.loaded) {
      handleRedirect()
    }
  }, [clerk.loaded])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      welcome
      <ClerkLoaded>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Completing authentication...
          </p>
        </div>
      </ClerkLoaded>
    </div>
  )
}
