import { useAuth, useSignIn, useSignUp } from '@clerk/react-router'
import { Link, Navigate } from 'react-router'
import { useMemo, useState } from 'react'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { Button } from '@/components/ui/button'
import { ArrowRight, Key, Lock, Shield, Sparkles } from '@/lib/icons'

type AuthMode = 'login' | 'signup'

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
  const switchHref = useMemo(() => {
    const params = new URLSearchParams()
    if (redirectTarget !== '/') {
      params.set('redirect', redirectTarget)
    }
    const suffix = params.toString()
    const path = isSignup ? '/login' : '/signup'
    return suffix ? `${path}?${suffix}` : path
  }, [isSignup, redirectTarget])

  if (!isLoaded) {
    return <AuthLoadingScreen />
  }

  if (isSignedIn) {
    return <Navigate to={redirectTarget} replace />
  }

  async function handleGoogle() {
    setError(null)
    setIsSubmitting(true)
    const callbackUrl = isSignup ? '/signup/sso-callback' : '/login/sso-callback'

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
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <AuthAtmosphere />
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,34rem)]">
        <section className="hidden min-h-screen flex-col justify-between p-10 lg:flex xl:p-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.28em] text-white/55">
            <Sparkles className="size-3.5 text-[#2447ff]" />
            Salemkode Chat
          </div>

          <div className="max-w-3xl pb-10">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl border border-[#2447ff]/30 bg-[#2447ff]/15 shadow-[0_0_40px_rgba(36,71,255,0.35)]">
                <Shield className="size-6 text-[#8ca0ff]" />
              </div>
              <div>
                <p className="text-sm text-white/45">Protected by Clerk</p>
                <p className="text-sm text-white/70">Synced with Convex sessions</p>
              </div>
            </div>
            <h1 className="max-w-2xl text-balance text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-white md:text-7xl xl:text-8xl">
              Enter the quiet room where your chats stay moving.
            </h1>
            <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-white/58">
              One custom sign-in surface, Clerk under the hood, and a cleaner handoff into the
              app. Less waiting room energy. More conversation.
            </p>
          </div>

          <div className="grid max-w-2xl grid-cols-3 gap-3 text-xs text-white/48">
            {['Single-origin auth', 'OAuth callback safe', 'Convex token ready'].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:justify-end lg:p-8">
          <div className="w-full max-w-[28rem] rounded-[2rem] border border-white/10 bg-[#08090d]/86 p-5 shadow-[0_24px_120px_rgba(0,0,0,0.72)] backdrop-blur-2xl sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2447ff]/25 bg-[#2447ff]/10 px-3 py-1 text-xs font-medium text-[#9bafff]">
                  <Key className="size-3.5" />
                  {isSignup ? 'Create access' : 'Welcome back'}
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white">
                  {isSignup ? 'Start fresh.' : 'Sign in.'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  {isSignup
                    ? 'Create your account with Google.'
                    : 'Use Google to continue.'}
                </p>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <Lock className="size-5 text-white/64" />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="none"
              className="h-12 w-full rounded-2xl border-white/10 bg-white text-[#11131a] shadow-[0_18px_50px_rgba(255,255,255,0.08)] hover:bg-[#e8ecff]"
              disabled={isBusy}
              onClick={() => void handleGoogle()}
            >
              <GoogleMark />
              {isBusy ? 'Opening Google...' : 'Continue with Google'}
              <ArrowRight className="size-4" />
            </Button>

            {error ? (
              <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/48">
              Google is the only enabled sign-in method for this Clerk instance right now.
            </div>

            <p className="mt-6 text-center text-sm text-white/48">
              {isSignup ? 'Already have an account?' : 'New here?'}{' '}
              <Link className="font-medium text-white underline-offset-4 hover:underline" to={switchHref}>
                {isSignup ? 'Sign in' : 'Create one'}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function AuthAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-12rem] top-[-10rem] size-[30rem] rounded-full bg-[#2447ff]/24 blur-[110px]" />
      <div className="absolute bottom-[-12rem] right-[-14rem] size-[34rem] rounded-full bg-[#0f8bff]/14 blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.075),transparent_22%),linear-gradient(120deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_100%,38px_38px] opacity-55" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  )
}

function GoogleMark() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-white text-[13px] font-bold text-[#2447ff]">
      G
    </span>
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
      const itemMessage: string | undefined = readMessage(item)
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
