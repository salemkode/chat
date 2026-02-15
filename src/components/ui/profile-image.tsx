'use client'

import { Camera, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ProfileImageProps {
  src?: string | null
  name?: string | null
  fallbackIcon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  onClick?: () => void
  className?: string
}

const sizeClasses = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
  xl: 'size-20',
}

const fallbackSizeClasses = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

const iconSizes = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
  xl: 'size-8',
}

const overlayIconSizes = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-4',
  xl: 'size-5',
}

const badgeSizes = {
  sm: 'p-0.5',
  md: 'p-1',
  lg: 'p-1',
  xl: 'p-1',
}

const badgeIconSizes = {
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-3',
  xl: 'size-3',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ProfileImage({
  src,
  name,
  fallbackIcon,
  size = 'md',
  editable = false,
  onClick,
  className,
}: ProfileImageProps) {
  const initials = name ? getInitials(name) : ''
  const displayName = name || ''

  return (
    <div 
      className={cn(
        'relative inline-block',
        editable && 'cursor-pointer group',
        className
      )} 
      onClick={onClick}
    >
      <Avatar className={cn(sizeClasses[size], 'ring-4 ring-background shadow-lg')}
      >
        <AvatarImage
          src={src || undefined}
          alt={displayName}
          className="object-cover"
        />
        <AvatarFallback className={cn(
          'bg-primary text-primary-foreground font-medium',
          fallbackSizeClasses[size]
        )}>
          {initials || fallbackIcon || <User className={iconSizes[size]} />}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          {/* Overlay */}
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-black/40 flex items-center justify-center',
              'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
            )}
          >
            <Camera className={cn('text-white', overlayIconSizes[size])} />
          </div>

          {/* Edit badge */}
          <div className={cn(
            'absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full shadow-md',
            badgeSizes[size]
          )}>
            <Camera className={badgeIconSizes[size]} />
          </div>
        </>
      )}
    </div>
  )
}
