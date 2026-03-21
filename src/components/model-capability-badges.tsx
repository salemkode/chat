'use client'

import { cn } from '@/lib/utils'
import { resolveCapabilityPresentation } from '@/lib/model-capabilities'

export function ModelCapabilityBadges({
  capabilities,
  className,
  max = 4,
}: {
  capabilities?: string[] | null
  className?: string
  max?: number
}) {
  if (!capabilities?.length) {
    return null
  }

  const shown = capabilities.slice(0, max)
  const overflow = capabilities.length - shown.length

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((raw, index) => {
        const presentation = resolveCapabilityPresentation(raw)
        if (!presentation) {
          return null
        }
        const { label, className: tone } = presentation
        return (
          <span
            key={`${raw}-${index}`}
            className={cn(
              'inline-flex max-w-[140px] truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
              tone,
            )}
            title={label}
          >
            {label}
          </span>
        )
      })}
      {overflow > 0 ? (
        <span className="text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}
