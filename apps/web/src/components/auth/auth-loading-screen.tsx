import { AppAtmosphere } from '@/components/app-atmosphere'
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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground selection:bg-foreground selection:text-background">
      <AppAtmosphere />
      
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-in fade-in zoom-in duration-1000">
          <OriginalThinkingAnimation
            variant="minimal"
            className="w-[4.75rem] max-w-[4.75rem] sm:w-[5.25rem] sm:max-w-[5.25rem] opacity-80"
          />
        </div>
        
        {isTakingLong ? (
          <div className="max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground dark:text-white/40">
              Synchronizing session
            </p>
            <p className="mx-auto max-w-[200px] font-mono text-xs leading-relaxed text-muted-foreground/70 dark:text-white/20">
              Establishing secure connection with Clerk & Convex.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
