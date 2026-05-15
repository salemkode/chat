import "@/global.css";
import { ClerkProvider } from "@clerk/expo";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { resourceCache, tokenCache } from "@/lib/clerk";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
      __experimental_resourceCache={resourceCache}
    >
      <ConvexClientProvider>
        <Slot />
        <StatusBar style="auto" />
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
