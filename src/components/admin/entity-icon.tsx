import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconType = 'emoji' | 'lucide' | 'upload' | undefined

export function EntityIcon({
  icon,
  iconType,
  iconUrl,
  fallback = 'Sparkles',
  className,
}: {
  icon?: string
  iconType?: IconType
  iconUrl?: string
  fallback?: string
  className?: string
}) {
  if (iconType === 'upload' && iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={cn('size-5 rounded-sm object-cover', className)}
      />
    )
  }

  if (icon && iconType === 'emoji') {
    return (
      <span className={cn('inline-flex size-5 items-center justify-center', className)}>
        {icon}
      </span>
    )
  }

  const iconName =
    iconType === 'lucide' && icon
      ? icon
      : fallback
  const IconComponent = (
    LucideIcons as unknown as Record<string, LucideIcon>
  )[iconName]

  if (IconComponent) {
    return <IconComponent className={cn('size-5', className)} />
  }

  return (
    <span
      className={cn(
        'inline-flex size-5 items-center justify-center rounded-sm bg-muted text-[10px] font-semibold',
        className,
      )}
    >
      ?
    </span>
  )
}
