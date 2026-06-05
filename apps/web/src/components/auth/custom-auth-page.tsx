import { useAuth, useSignIn } from '@clerk/react-router'
import { Navigate } from 'react-router'
import { useState } from 'react'
import { AuthAtmosphere } from '@/components/auth/auth-atmosphere'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { Button } from '@/components/ui/button'
import { ArrowRight } from '@/lib/icons'

type CustomAuthPageProps = {
  redirectTarget: string
}

export function CustomAuthPage({ redirectTarget }: CustomAuthPageProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isBusy = isSubmitting || signInFetchStatus === 'fetching'

  if (!isLoaded) {
    return <AuthLoadingScreen />
  }

  if (isSignedIn) {
    return <Navigate to={redirectTarget} replace />
  }

  async function handleGoogle() {
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await signIn.sso({
        strategy: 'oauth_google',
        redirectUrl: redirectTarget,
        redirectCallbackUrl: '/auth/sso-callback',
      })

      if (result.error) {
        setError(formatClerkError(result.error))
      }
    } catch (caughtError) {
      setError(formatClerkError(caughtError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background text-foreground selection:bg-foreground selection:text-background">
      <AuthAtmosphere />

      <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-[24rem] p-6 duration-1000">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/[0.02] dark:shadow-none sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-foreground/[0.02] to-transparent dark:from-white/[0.02]" />

          <div className="relative z-10 space-y-10">
            <header className="space-y-3 text-center">
              <h1 className="text-4xl font-light tracking-[-0.06em]">Continue.</h1>
            </header>

            <div className="space-y-6">
              <Button
                type="button"
                variant="plain"
                size="none"
                className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-foreground text-background transition-all hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                disabled={isBusy}
                onClick={() => void handleGoogle()}
              >
                <GoogleMark />
                <span className="font-medium tracking-tight">
                  {isBusy ? 'Verifying...' : 'Continue with Google'}
                </span>
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>

              {error ? (
                <div className="animate-in fade-in zoom-in-95 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-destructive dark:border-white/10 dark:bg-white/[0.03] dark:text-red-400">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function GoogleMark() {
  return (
    <svg className="size-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function formatClerkError(error: unknown) {
  const directMessage = readMessage(error)
  if (directMessage) {
    return directMessage
  }

  if (Array.isArray(error)) {
    for (const item of error) {
      const itemMessage = readMessage(item)
      if (itemMessage) {
        return itemMessage
      }
    }
  }

  return 'Authentication could not be completed. Please try again.'
}

function readMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const longMessage = value.longMessage
  if (typeof longMessage === 'string') {
    return longMessage
  }

  const message = value.message
  if (typeof message === 'string') {
    return message
  }

  const errors = value.errors
  if (Array.isArray(errors)) {
    for (const item of errors) {
      const itemMessage = readMessage(item)
      if (itemMessage) {
        return itemMessage
      }
    }
  }

  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
