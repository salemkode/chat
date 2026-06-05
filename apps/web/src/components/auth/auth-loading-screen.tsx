import { OriginalThinkingAnimation } from '@/components/auth/original-thinking-animation'
import { useEffect, useState } from 'react'

export function AuthLoadingScreen() {
  const [isTakingLong, setIsTakingLong] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsTakingLong(true)
    }, 8_000)

    return () => window.clearTimeout(timeout)
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-black p-6 text-center text-white selection:bg-white selection:text-black">
      <AuthAtmosphere />
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-in fade-in zoom-in duration-1000">
          <OriginalThinkingAnimation
            variant="minimal"
            className="w-[4.75rem] max-w-[4.75rem] sm:w-[5.25rem] sm:max-w-[5.25rem] opacity-80"
          />
        </div>
        
        {isTakingLong ? (
          <div className="max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Synchronizing session
            </p>
            <p className="text-xs text-white/20 leading-relaxed max-w-[200px] mx-auto font-mono">
              Establishing secure connection with Clerk & Convex.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AuthAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-black" />
      <div className="bg-noise absolute inset-0 opacity-[0.02] contrast-150 brightness-150" />
      <div className="absolute left-[-10%] top-[-10%] h-[120%] w-[120%] -rotate-12 transform">
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_50%)]" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  )
}
