import { Icon } from '@/components/icon'
import { SettingsPage, SettingsSection } from '@/components/settings/settings-shell'
import { useThemePreference } from '@/hooks/use-theme-preference'
import type { ThemeMode } from '@/lib/theme-preference'
import { Monitor, Moon, Sun } from 'lucide-react-native'
import { Pressable, ScrollView, Text, View } from 'react-native'

const THEME_OPTIONS: {
  id: ThemeMode
  label: string
  description: string
}[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Bright neutral surfaces for daytime use.',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'A darker workspace for low-light environments.',
  },
  {
    id: 'system',
    label: 'System',
    description: 'Matches your device appearance automatically.',
  },
]

export default function AppearanceScreen() {
  const { settings, setMode } = useThemePreference()

  return (
    <SettingsPage title="Theme">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-10">
        <SettingsSection
          title="Appearance"
          description="Pick the visual mode that should follow you through every chat."
        >
          {THEME_OPTIONS.map((option, index) => {
            const selected = settings.mode === option.id
            const optionIcon = option.id === 'light' ? Sun : option.id === 'dark' ? Moon : Monitor
            return (
              <View key={option.id}>
                <Pressable
                  onPress={() => void setMode(option.id)}
                  className={`px-4 py-4 active:bg-muted/60 ${selected ? 'bg-muted/40' : ''}`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                      <Icon icon={optionIcon} className="h-[18px] w-[18px] text-foreground" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-[16px] font-medium text-foreground">
                          {option.label}
                        </Text>
                        {selected ? (
                          <View className="rounded-full bg-foreground px-2.5 py-1">
                            <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-background">
                              Active
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {option.description}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                {index < THEME_OPTIONS.length - 1 ? (
                  <View className="mx-4 h-px bg-border/80" />
                ) : null}
              </View>
            )
          })}
        </SettingsSection>
      </ScrollView>
    </SettingsPage>
  )
}
