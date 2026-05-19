import { cn } from '@/lib/utils'

type ChatInlineErrorProps = {
  message: string
  variant?: 'composer' | 'message'
  className?: string
}

/** Inline chat error — red dot + text only (no bg, border, or shadow). */
export function ChatInlineError({
  message,
  variant = 'message',
  className,
}: ChatInlineErrorProps) {
  const copy = message.trim() || 'Something went wrong. Try again.'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-2 px-3 py-2.5',
        variant === 'composer' && 'items-center',
        className,
      )}
    >
      <span
        className={cn(
          'size-2 shrink-0 rounded-full bg-[#EF4444]',
          variant === 'message' && 'mt-1.5',
        )}
        aria-hidden
      />
      <p
        className={cn(
          'flex-1 text-muted-foreground',
          variant === 'composer' ? 'text-xs leading-4' : 'text-sm leading-5',
        )}
      >
        {copy}
      </p>
    </div>
  )
}
