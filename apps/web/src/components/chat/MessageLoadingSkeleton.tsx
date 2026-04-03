import { Check, Circle, LoaderCircle } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function MessageLoadingSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-2">
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-[1.5rem] rounded-br-md bg-secondary/80 px-4 py-3 shadow-sm shimmer-container">
          <div className="shimmer-bg bg-secondary h-3.5 w-48 rounded-full" />
          <div className="mt-2 shimmer-bg bg-secondary h-3.5 w-32 rounded-full" />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-sm shimmer-container">
        <div className="space-y-1">
          <LoadingStep
            status="complete"
            titleWidth="w-24"
            subtitleWidth="w-40"
          />
          <LoadingStep
            status="running"
            titleWidth="w-32"
            subtitleWidth="w-52"
          />
          <LoadingStep
            status="pending"
            titleWidth="w-36"
            subtitleWidth="w-28"
            isLast
          />
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-border/70 bg-card/85 p-5 shadow-sm shimmer-container">
        <div className="space-y-3">
          <div className="shimmer-bg bg-muted h-3.5 w-full rounded-full" />
          <div className="shimmer-bg bg-muted h-3.5 w-[92%] rounded-full" />
          <div className="shimmer-bg bg-muted h-3.5 w-[76%] rounded-full" />
          <div className="shimmer-bg bg-muted h-3.5 w-[84%] rounded-full" />
        </div>
      </div>
    </div>
  )
}

function LoadingStep({
  status,
  titleWidth,
  subtitleWidth,
  isLast = false,
}: {
  status: 'complete' | 'running' | 'pending'
  titleWidth: string
  subtitleWidth: string
  isLast?: boolean
}) {
  return (
    <div className="relative flex gap-3">
      <div className="relative flex w-6 shrink-0 justify-center">
        {!isLast ? (
          <div className="absolute left-1/2 top-6 bottom-[-0.75rem] w-px -translate-x-1/2 bg-border/80" />
        ) : null}
        <div
          className={cn(
            'relative z-10 mt-1 flex size-6 items-center justify-center rounded-full border bg-background',
            status === 'complete' &&
              'border-foreground/90 bg-foreground text-background',
            status === 'running' && 'border-border bg-background text-muted-foreground',
            status === 'pending' && 'border-border/80 bg-background text-transparent',
          )}
        >
          {status === 'complete' ? (
            <Check className="size-3.5" />
          ) : status === 'running' ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Circle className="size-3.5 fill-background text-border" />
          )}
        </div>
      </div>

      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl px-4 py-3',
          status === 'running' && 'bg-muted/70',
        )}
      >
        <div className={cn('shimmer-bg bg-muted h-3.5 rounded-full', titleWidth)} />
        <div
          className={cn(
            'mt-2 shimmer-bg bg-muted h-3 rounded-full',
            subtitleWidth,
          )}
        />
      </div>
    </div>
  )
}
