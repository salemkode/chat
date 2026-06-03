import { Icon } from '@/components/icon'
import { Image as ExpoImage, ImageProps, type ImageStyle } from 'expo-image'
import {
  ArrowUp,
  ChevronDown,
  HelpCircle,
  MessageSquare,
  Plus,
  Square,
  type LucideIcon,
} from 'lucide-react-native'

import { withUniwind } from 'uniwind'

const Image = withUniwind(ExpoImage)

/** Map `text-*` Tailwind classes to `accent-*` for tint/color props. */
function accentColorClassFromClassName(className: string | undefined): string | undefined {
  if (!className) {
    return undefined
  }

  const match = className.match(/\btext-([a-z0-9-]+(?:\/[0-9.]+)?)/)
  if (!match) {
    return undefined
  }

  return `accent-${match[1]}`
}

/**
 * Map of SF Symbol names to Lucide icons for Android/web fallback.
 */
const LUCIDE_FALLBACKS: Record<string, LucideIcon> = {
  'arrow.up': ArrowUp,
  'chevron.down': ChevronDown,
  'bubble.left.and.bubble.right': MessageSquare,
  plus: Plus,
  'stop.fill': Square,
}

type SymbolImageProps = {
  /** SF Symbol name (e.g. "arrow.up", "chevron.down") */
  name: string
  size?: number
  tintColor?: string
  /** Tint on iOS SF Symbols; icon stroke on Android Lucide fallbacks. */
  tintColorClassName?: string
  style?: ImageStyle
  className?: string
  sfEffect?: ImageProps['sfEffect']
  transition?: ImageProps['transition']
}

export function SymbolImage({
  name,
  size = 24,
  tintColor,
  tintColorClassName,
  style,
  className,
  sfEffect,
  transition,
}: SymbolImageProps) {
  const resolvedTintColorClassName =
    tintColorClassName ?? accentColorClassFromClassName(className)

  if (process.env.EXPO_OS === 'ios') {
    return (
      <Image
        sfEffect={sfEffect}
        transition={transition}
        source={`sf:${name}`}
        style={[{ width: size, height: size }, style]}
        tintColor={tintColor}
        tintColorClassName={resolvedTintColorClassName}
        className={className}
      />
    )
  }

  const LucideIcon = LUCIDE_FALLBACKS[name] ?? HelpCircle
  return (
    <Icon
      icon={LucideIcon}
      style={[{ width: size, height: size }, style]}
      className={className}
      colorClassName={resolvedTintColorClassName}
      color={tintColor}
    />
  )
}
