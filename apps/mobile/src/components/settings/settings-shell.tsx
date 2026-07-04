import { AppHeader } from '@/components/app-header'
import { Icon } from '@/components/icon'
import type { LucideIcon } from 'lucide-react-native'
import { Text, View } from 'react-native'

export function SettingsPage({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View className="flex-1 bg-background">
      <View pointerEvents="none" className="absolute inset-x-0 top-0 h-48 overflow-hidden">
        <View className="absolute -top-20 left-6 h-40 w-40 rounded-full bg-foreground/6" />
        <View className="absolute top-6 right-[-28] h-32 w-32 rounded-full bg-muted" />
      </View>
      <AppHeader title={title} showBackButton />
      <View className="flex-1">{children}</View>
    </View>
  )
}

export function SettingsHeroCard({
  icon,
  eyebrow,
  title,
  description,
  trailing,
}: {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  trailing?: React.ReactNode
}) {
  return (
    <View
      className="mx-5 mt-4 rounded-[28px] border border-border bg-card px-4 py-4 shadow-card"
      style={{ borderCurve: 'continuous' }}
    >
      <View className="flex-row items-start gap-4">
        <View className="h-12 w-12 items-center justify-center rounded-[18px] bg-foreground">
          <Icon icon={icon} className="h-5 w-5 text-background" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-[12px] font-medium uppercase tracking-[1.2px] text-muted-foreground">
            {eyebrow}
          </Text>
          <Text className="text-[22px] font-semibold text-foreground">{title}</Text>
          <Text className="text-[14px] leading-6 text-muted-foreground">{description}</Text>
        </View>
        {trailing ? <View className="pt-1">{trailing}</View> : null}
      </View>
    </View>
  )
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <View className="mt-6 px-5">
      <Text className="text-[12px] font-medium uppercase tracking-[1px] text-muted-foreground">
        {title}
      </Text>
      {description ? (
        <Text className="mt-2 text-[14px] leading-6 text-muted-foreground">{description}</Text>
      ) : null}
      <View
        className="mt-3 overflow-hidden rounded-[24px] border border-border bg-card shadow-card"
        style={{ borderCurve: 'continuous' }}
      >
        {children}
      </View>
    </View>
  )
}
