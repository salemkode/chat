import { getBrandIcon, type BrandIconName } from '@chat/shared/brand-icons'
import { cn } from '@/lib/utils'

export function BrandIcon({
  name,
  className,
}: {
  name: BrandIconName
  className?: string
}) {
  const icon = getBrandIcon(name)

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('size-5 shrink-0', className)}
      style={{ color: `#${icon.hex}` }}
      fill="currentColor"
    >
      <path d={icon.path} />
    </svg>
  )
}
