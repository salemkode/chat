import { Icon } from '@/components/icon'
import { useStableSafeAreaInsets } from '@/utils/use-stable-safe-area-insets'
import { useRouter } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { ChevronLeft, X } from 'lucide-react-native'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

type AppHeaderProps = {
  title?: string
  subtitle?: string
  center?: ReactNode
  left?: ReactNode
  right?: ReactNode
  bottom?: ReactNode
  showBackButton?: boolean
  showCloseButton?: boolean
  onBack?: () => void
  testID?: string
}

export function AppHeader({
  title,
  subtitle,
  center,
  left,
  right,
  bottom,
  showBackButton = false,
  showCloseButton = false,
  onBack,
  testID,
}: AppHeaderProps) {
  const insets = useStableSafeAreaInsets()
  const router = useRouter()

  const goBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/')
  }

  const leftContent =
    left ??
    (showBackButton ? (
      <HeaderIconButton icon={ChevronLeft} accessibilityLabel="Go back" onPress={goBack} />
    ) : null)

  const rightContent =
    right ??
    (showCloseButton ? (
      <HeaderIconButton icon={X} accessibilityLabel="Close" onPress={goBack} />
    ) : null)

  return (
    <View
      testID={testID}
      collapsable={false}
      accessibilityRole="header"
      accessibilityLabel={title ?? 'App header'}
      className="border-b border-border/70 bg-background"
      style={{ paddingTop: insets.top }}
    >
      <View className="min-h-14 flex-row items-center px-3">
        <View className="w-24 flex-row items-center justify-start">{leftContent}</View>
        <View className="min-w-0 flex-1 items-center px-2">
          {center ?? (
            <View className="min-w-0 items-center">
              {title ? (
                <Text
                  numberOfLines={1}
                  className="text-center text-[17px] font-semibold text-foreground"
                >
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-center text-[12px] text-muted-foreground"
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </View>
        <View className="w-24 flex-row items-center justify-end">{rightContent}</View>
      </View>
      {bottom ? <View className="px-4 pb-3">{bottom}</View> : null}
    </View>
  )
}

export function HeaderIconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled,
}: {
  icon: LucideIcon
  accessibilityLabel: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
    >
      <Icon icon={icon} className="h-5.5 w-5.5 text-foreground" />
    </Pressable>
  )
}
