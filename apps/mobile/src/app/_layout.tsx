import { ClerkProvider } from "@clerk/expo";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { resourceCache, tokenCache } from "@/lib/clerk";
import "@/global.css";
import "@/utils/fetch-polyfill";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          <StatusBar style="auto" />
        </KeyboardProvider>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
