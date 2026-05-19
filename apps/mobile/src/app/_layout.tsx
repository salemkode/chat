import { ClerkProvider } from "@clerk/expo";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { resourceCache, tokenCache } from "@/lib/clerk";
import "@/global.css";
import { ThemedStatusBar } from "@/components/themed-status-bar";
import { ThemePreferenceBootstrap } from "@/components/theme-preference-bootstrap";
import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const unstable_settings = {
  anchor: "index",
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
      __experimental_resourceCache={resourceCache}
    >
      <ConvexClientProvider>
        <ThemePreferenceBootstrap />
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <ThemedStatusBar />
        </KeyboardProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
