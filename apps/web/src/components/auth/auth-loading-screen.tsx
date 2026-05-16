import { OriginalThinkingAnimation } from '@/components/auth/original-thinking-animation'

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-[#2447ff]">
      <OriginalThinkingAnimation
        variant="minimal"
        className="w-[4.75rem] max-w-[4.75rem] sm:w-[5.25rem] sm:max-w-[5.25rem]"
      />
    </div>
  )
}
