import { OriginalThinkingAnimation } from '@/components/auth/original-thinking-animation'
import { cn } from '@/lib/utils'

export function OriginalThinkingLoader({
  className,
}: {
  className?: string
}) {
  return (
    <OriginalThinkingAnimation
      variant="minimal"
      className={cn('size-4 max-w-4 shrink-0 text-primary', className)}
    />
  )
}
