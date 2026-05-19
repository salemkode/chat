import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useCSSVariable } from "uniwind";

const GLASS = isLiquidGlassAvailable();
const IS_ANDROID = process.env.EXPO_OS === "android";

export default function AttachmentsLayout() {
  const appForeground = useCSSVariable("--app-foreground") as string;
  const appBackground = useCSSVariable("--app-background") as string;

  return (
    <Stack
      screenOptions={{
        headerTintColor: appForeground,
        headerTransparent: GLASS,
        headerBackButtonDisplayMode: GLASS ? "minimal" : "default",
        headerShadowVisible: IS_ANDROID ? false : undefined,
        headerStyle: IS_ANDROID
          ? {
              backgroundColor: appBackground,
            }
          : undefined,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="project-picker"
        options={{
          title: "Project",
          headerLargeTitleShadowVisible: false,
        }}
      />
    </Stack>
  );
}
