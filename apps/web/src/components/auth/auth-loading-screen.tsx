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
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#050505] p-6 text-center text-[#2447ff]">
      <OriginalThinkingAnimation
        variant="minimal"
        className="w-[4.75rem] max-w-[4.75rem] sm:w-[5.25rem] sm:max-w-[5.25rem]"
      />
      {isTakingLong ? (
        <div className="max-w-sm space-y-1 text-sm text-white/68">
          <p>Still connecting to your session...</p>
          <p className="text-xs text-white/45">
            This can happen while Clerk or Convex refreshes auth after a long break.
          </p>
        </div>
      ) : null}
    </div>
  )
}
