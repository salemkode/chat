import { useAuth, useSignIn, useSignUp } from '@clerk/react-router'
import { Link, Navigate } from 'react-router'
import { useState } from 'react'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { Button } from '@/components/ui/button'
import { buildAuthUrl, type AuthMode } from '@/lib/auth-redirect'
import { ArrowRight } from '@/lib/icons'

type CustomAuthPageProps = {
  mode: AuthMode
  redirectTarget: string
}

export function CustomAuthPage({ mode, redirectTarget }: CustomAuthPageProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn()
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSignup = mode === 'signup'
  const isBusy = isSubmitting || signInFetchStatus === 'fetching' || signUpFetchStatus === 'fetching'
  const switchHref = buildAuthUrl({
    mode: isSignup ? 'login' : 'signup',
    redirectTarget,
  })

  if (!isLoaded) {
    return <AuthLoadingScreen />
  }

  if (isSignedIn) {
    return <Navigate to={redirectTarget} replace />
  }

  async function handleGoogle() {
    setError(null)
    setIsSubmitting(true)
    const callbackUrl = isSignup ? '/auth/sso-callback?mode=signup' : '/auth/sso-callback'

    try {
      const result = isSignup
        ? await signUp.sso({
            strategy: 'oauth_google',
            redirectUrl: redirectTarget,
            redirectCallbackUrl: callbackUrl,
          })
        : await signIn.sso({
            strategy: 'oauth_google',
            redirectUrl: redirectTarget,
            redirectCallbackUrl: callbackUrl,
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
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white selection:bg-white selection:text-black">
      <AuthAtmosphere />

      <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-[24rem] p-6 duration-1000">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 backdrop-blur-3xl sm:p-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent" />

          <div className="relative z-10 space-y-10">
            <header className="space-y-3 text-center">
              <h1 className="text-4xl font-light tracking-[-0.06em]">
                {isSignup ? 'Begin.' : 'Continue.'}
              </h1>
            </header>

            <div className="space-y-6">
              <Button
                type="button"
                variant="plain"
                size="none"
                className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white text-black transition-all hover:bg-neutral-200"
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
                <div className="animate-in fade-in zoom-in-95 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[11px] leading-relaxed text-red-400">
                  {error}
                </div>
              ) : null}
            </div>

            <footer className="pt-2 text-center">
              <Link
                className="font-mono text-[10px] tracking-widest text-white/20 transition-colors hover:text-white/60"
                to={switchHref}
              >
                {isSignup ? 'SIGN IN' : 'CREATE ONE'}
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </main>
  )
}

function AuthAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-black" />
      <div className="bg-noise absolute inset-0 opacity-[0.03] contrast-150 brightness-150" />
      <div className="absolute left-[-10%] top-[-10%] h-[120%] w-[120%] -rotate-12 transform">
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_0%,transparent_50%)]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
    </div>
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
