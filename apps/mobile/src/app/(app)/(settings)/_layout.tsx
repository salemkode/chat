import { Stack } from "expo-router";
import { useCSSVariable } from "uniwind";

export default function SettingsLayout() {
  const appForeground = useCSSVariable("--app-foreground");
  const appBackground = useCSSVariable("--app-background");

  return (
    <Stack
      screenOptions={{
        headerTransparent: false,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: "default",
        headerTintColor:
          typeof appForeground === "string" ? appForeground : undefined,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor:
            typeof appBackground === "string" ? appBackground : undefined,
        },
      }}
    >
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="appearance"
        options={{
          title: "Theme",
        }}
      />
      <Stack.Screen
        name="models"
        options={{
          title: "Models & reasoning",
        }}
      />
      <Stack.Screen
        name="memory"
        options={{
          title: "Memory",
        }}
      />
    </Stack>
  );
}
