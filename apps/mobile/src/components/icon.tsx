import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { withUniwind } from 'uniwind'
import type { LucideIcon } from 'lucide-react-native'

function IconBase({
  icon: Icon,
  style,
  color,
  strokeWidth,
}: {
  icon: LucideIcon
  style?: StyleProp<ViewStyle | TextStyle>
  color?: string
  strokeWidth?: number
  className?: string
}) {
  const flat = StyleSheet.flatten(style) || {}
  const width = 'width' in flat && typeof flat.width === 'number' ? flat.width : undefined
  const height = 'height' in flat && typeof flat.height === 'number' ? flat.height : undefined
  const styleColor = 'color' in flat && typeof flat.color === 'string' ? flat.color : undefined
  const size = width ?? height ?? 24
  const resolvedColor = color ?? styleColor ?? 'currentColor'
  return <Icon size={size} color={resolvedColor} strokeWidth={strokeWidth} />
}

export const Icon = withUniwind(IconBase)
