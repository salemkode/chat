import {
  SettingsHeroCard,
  SettingsPage,
  SettingsSection,
} from '@/components/settings/settings-shell'
import { SettingsRow, SettingsSectionDivider } from '@/components/settings/settings-row'
import { useThemePreference } from '@/hooks/use-theme-preference'
import { useViewer } from '@/hooks/use-viewer'
import { useAuth } from '@clerk/expo'
import { Brain, CircleUser, Database, LogOut, Palette, ShieldCheck } from 'lucide-react-native'
import { Alert, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function themeModeLabel(mode: string) {
  if (mode === 'light') return 'Light'
  if (mode === 'dark') return 'Dark'
  return 'System'
}

export default function SettingsScreen() {
  const viewer = useViewer()
  const { settings: themeSettings } = useThemePreference()
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()
  const viewerInitial = viewer?.name?.trim().charAt(0) || viewer?.email?.trim().charAt(0) || 'Y'

  return (
    <SettingsPage title="Settings">
      <ScrollView
        className="flex-1 text-foreground"
        contentContainerStyle={{
          paddingBottom: (process.env.EXPO_OS === 'android' ? insets.bottom : 0) + 28,
        }}
      >
        <SettingsHeroCard
          icon={ShieldCheck}
          eyebrow="Workspace"
          title="Settings"
          description="Tune your profile, visual theme, model behavior, and memory preferences from one focused control panel."
          trailing={
            <View className="h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
              <Text className="text-[18px] font-semibold uppercase text-foreground">
                {viewerInitial}
              </Text>
            </View>
          }
        />

        {viewer?.email ? (
          <View
            className="mx-5 mt-4 rounded-[22px] border border-border bg-muted/60 px-4 py-3"
            style={{ borderCurve: 'continuous' }}
          >
            <Text className="text-[12px] font-medium uppercase tracking-[1px] text-muted-foreground">
              Signed in as
            </Text>
            <Text selectable className="mt-1 text-[15px] text-foreground">
              {viewer.email}
            </Text>
          </View>
        ) : null}

        <SettingsSection
          title="Personalize"
          description="Adjust how the app looks and how chat defaults behave before you start typing."
        >
          <SettingsRow
            icon={CircleUser}
            label="Account"
            description="Profile details, avatar, and personal bio."
            href="/(app)/(settings)/profile"
          />
          <SettingsSectionDivider />
          <SettingsRow
            icon={Palette}
            label="Theme"
            detail={themeModeLabel(themeSettings.mode)}
            description="Choose the appearance that fits your device and workflow."
            href="/(app)/(settings)/appearance"
          />
          <SettingsSectionDivider />
          <SettingsRow
            icon={Brain}
            label="Models & reasoning"
            description="Control model routing, defaults, and reasoning depth."
            href="/(app)/(settings)/models"
          />
          <SettingsSectionDivider />
          <SettingsRow
            icon={Database}
            label="Memory"
            description="Review long-term memory behavior and search stored items."
            href="/(app)/(settings)/memory"
          />
        </SettingsSection>

        <SettingsSection
          title="Session"
          description="Manage access to this device and close your session when needed."
        >
          <SettingsRow
            icon={LogOut}
            label="Log out"
            description="Sign out of this account on this device."
            tone="destructive"
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ])
            }}
          />
        </SettingsSection>
      </ScrollView>
    </SettingsPage>
  )
}
