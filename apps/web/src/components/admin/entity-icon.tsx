import { inferBrandIconName } from '@chat/core/brand-icons'
import { cn } from '@/lib/utils'
import { getIcon } from '@/lib/icons'
import type { IconType } from '@chat/core/admin-types'
import { BrandIcon } from '@/components/admin/brand-icon'

export type { IconType }

export function EntityIcon({
  icon,
  iconType,
  iconUrl,
  providerType,
  modelId,
  name,
  fallback = 'Sparkles',
  className,
}: {
  icon?: string
  iconType?: IconType
  iconUrl?: string
  providerType?: string
  modelId?: string
  name?: string
  fallback?: string
  className?: string
}) {
  if (iconType === 'upload' && iconUrl) {
    return <img src={iconUrl} alt="" className={cn('size-5 rounded-sm object-cover', className)} />
  }

  if (icon && iconType === 'emoji') {
    return (
      <span className={cn('inline-flex size-5 items-center justify-center', className)}>
        {icon}
      </span>
    )
  }

  const brandIconName = inferBrandIconName({
    icon,
    iconType,
    providerType,
    modelId,
    displayName: name,
    name,
  })
  if (brandIconName) {
    return <BrandIcon name={brandIconName} className={className} />
  }

  const iconName = iconType === 'phosphor' && icon ? icon : fallback
  const IconComponent = getIcon(iconName)

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
