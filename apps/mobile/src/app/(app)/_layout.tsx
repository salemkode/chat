import {
  DrawerContent,
  DrawerProvider,
  useDrawer,
} from "@/components/drawer-content";
import { DrawerLayout } from "@/components/drawer-layout";
import { AuthGate } from "@/components/auth-gate";
import { ChatAttachmentsProvider } from "@/components/chat/attachment-context";
import { ChatComposerOptionsProvider } from "@/components/chat/composer-options-context";
import { ComposerToastProvider } from "@/components/composer-toast";
import { ModelProvider } from "@/components/model-context";
import { hydrateThreadSelection } from "@/state/thread-selection";
import { useSystemBackgroundColor } from "@/utils/use-system-background-color";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import {
  DefaultTheme,
  ThemeProvider as RouterThemeProvider,
} from "expo-router/react-navigation";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";
import { OfflineSessionSync } from "@/components/offline-session-sync";
import { MobileChatCoreProvider } from "@/components/mobile-chat-core-provider";

const GLASS = isLiquidGlassAvailable();
const IS_ANDROID = process.env.EXPO_OS === "android";

function ThemeProvider(props: { children: React.ReactNode }) {
  return (
    <RouterThemeProvider value={DefaultTheme}>
      {props.children}
    </RouterThemeProvider>
  );
}

export default function AppLayout() {
  useEffect(() => {
    void hydrateThreadSelection();
  }, []);

  return (
    <AuthGate>
      <ThemeProvider>
        <MobileChatCoreProvider>
          <OfflineSessionSync />
          <ModelProvider>
            <ChatComposerOptionsProvider>
              <ChatAttachmentsProvider>
                <ComposerToastProvider>
                  <SafeAreaProvider>
                    <DrawerProvider>
                      <RootDrawer />
                    </DrawerProvider>
                  </SafeAreaProvider>
                </ComposerToastProvider>
              </ChatAttachmentsProvider>
            </ChatComposerOptionsProvider>
          </ModelProvider>
        </MobileChatCoreProvider>
      </ThemeProvider>
    </AuthGate>
  );
}

function RootDrawer() {
  const router = useRouter();
  const { isOpen, canOpenDrawer, openDrawer, closeDrawer } = useDrawer();

  useSystemBackgroundColor();

  return (
    <DrawerLayout
      open={isOpen}
      onOpen={openDrawer}
      onClose={closeDrawer}
      swipeEnabled={canOpenDrawer}
      drawerContent={
        <DrawerContent
          onNavigate={(path) => {
            closeDrawer();
            router.replace(path, { withAnchor: true });
          }}
          onOpenModal={(path) => {
            router.navigate(path);
          }}
        />
      }
    >
      <StackLayout />
    </DrawerLayout>
  );
}

function StackLayout() {
  const appForeground = useCSSVariable("--app-foreground") as string;
  const appBackground = useCSSVariable("--app-background") as string;

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "default",
        headerTintColor: appForeground,
        headerShadowVisible: IS_ANDROID ? false : undefined,
        contentStyle: {
          backgroundColor: appBackground,
        },
        headerStyle:
          IS_ANDROID || !GLASS
          ? {
              backgroundColor: appBackground,
            }
          : undefined,
      }}
    >
      <Stack.Screen
        name="index"
        dangerouslySingular
        options={{
          title: "Chat",
          animation: "none",
          gestureEnabled: false,
          headerTransparent: GLASS,
          headerBackButtonDisplayMode: GLASS ? "minimal" : "default",
        }}
      />

      <Stack.Screen
        name="chats"
        options={{
          title: "Chats",
          animation: "none",
          headerLargeTitleShadowVisible: false,
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="attachments"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.55],
          sheetCornerRadius: IS_ANDROID ? 28 : undefined,
          sheetGrabberVisible: true,
        }}
      />

      <Stack.Screen
        name="model-picker"
        options={{
          title: "Model",
          presentation: "formSheet",
          sheetAllowedDetents: "fitToContents",
          sheetCornerRadius: IS_ANDROID ? 28 : undefined,
          sheetGrabberVisible: true,
          headerLargeTitleShadowVisible: false,
        }}
      />

      <Stack.Screen
        name="(settings)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
