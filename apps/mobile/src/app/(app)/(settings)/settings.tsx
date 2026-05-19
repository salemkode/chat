import {
  SettingsRow,
  SettingsSectionDivider,
} from "@/components/settings/settings-row";
import { useThemePreference } from "@/hooks/use-theme-preference";
import { useViewer } from "@/hooks/use-viewer";
import { useAuth } from "@clerk/expo";
import {
  Brain,
  CircleUser,
  Database,
  LogOut,
  Palette,
} from "lucide-react-native";
import { Alert, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function themeModeLabel(mode: string) {
  if (mode === "light") return "Light";
  if (mode === "dark") return "Dark";
  return "System";
}

export default function SettingsScreen() {
  const viewer = useViewer();
  const { settings: themeSettings } = useThemePreference();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <ScrollView
      className="flex-1 bg-background text-foreground"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom:
          process.env.EXPO_OS === "android" ? insets.bottom : undefined,
      }}
    >
      {viewer?.email ? (
        <View
          className="mx-5 mt-4 mb-5 bg-muted rounded-xl px-4 py-3"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-[15px] text-foreground">
            {viewer.email}
          </Text>
        </View>
      ) : null}

      <SettingsRow
        icon={CircleUser}
        label="Account"
        href="/(settings)/profile"
      />
      <SettingsRow
        icon={Palette}
        label="Theme"
        detail={themeModeLabel(themeSettings.mode)}
        href="/(settings)/appearance"
      />
      <SettingsRow
        icon={Brain}
        label="Models & reasoning"
        href="/(settings)/models"
      />
      <SettingsRow icon={Database} label="Memory" href="/(settings)/memory" />

      <SettingsSectionDivider />

      <SettingsRow
        icon={LogOut}
        label="Log out"
        onPress={() => {
          Alert.alert("Sign Out", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign Out",
              style: "destructive",
              onPress: () => signOut(),
            },
          ]);
        }}
      />
    </ScrollView>
  );
}
