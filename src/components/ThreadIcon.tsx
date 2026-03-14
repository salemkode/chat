'use client'

import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ThreadIconProps {
  iconName?: string
  emoji?: string
  className?: string
  size?: number
}

// Fallback icon when none specified
const DefaultIcon = LucideIcons.MessageCircle

export function ThreadIcon({
  iconName,
  emoji,
  className = '',
  size = 16,
}: ThreadIconProps) {
  // If we have an icon name, try to render the Lucide icon
  if (iconName) {
    // Convert kebab-case or snake_case to PascalCase for Lucide
    const normalizedName = iconName
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (_, char) => char.toUpperCase())

    // Get the icon from Lucide
    const IconComponent = (
      LucideIcons as unknown as Record<string, LucideIcon>
    )[normalizedName]

    if (IconComponent) {
      return <IconComponent className={className} size={size} />
    }
  }

  // Fallback to emoji or default icon
  if (emoji && emoji !== '💬') {
    return <span className={className}>{emoji}</span>
  }

  return <DefaultIcon className={className} size={size} />
}
