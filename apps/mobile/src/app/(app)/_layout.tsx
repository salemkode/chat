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
import { useEffect } from "react";
import {
  DefaultTheme,
  ThemeProvider as RNTheme,
} from "@react-navigation/native";
import { useCSSVariable } from "uniwind";
import { ChatCoreProvider } from "@chat/chat-core";
import { chatCoreApiRefs } from "@/lib/chat-core-api";

const GLASS = isLiquidGlassAvailable();
const IS_ANDROID = process.env.EXPO_OS === "android";

function ThemeProvider(props: { children: React.ReactNode }) {
  return (
    <RNTheme value={DefaultTheme}>
      {props.children}
    </RNTheme>
  );
}

export default function AppLayout() {
  useEffect(() => {
    void hydrateThreadSelection();
  }, []);

  return (
    <AuthGate>
      <ThemeProvider>
        <ChatCoreProvider apiRefs={chatCoreApiRefs}>
          <ModelProvider>
            <ChatComposerOptionsProvider>
              <ChatAttachmentsProvider>
                <ComposerToastProvider>
                  <DrawerProvider>
                    <RootDrawer />
                  </DrawerProvider>
                </ComposerToastProvider>
              </ChatAttachmentsProvider>
            </ChatComposerOptionsProvider>
          </ModelProvider>
        </ChatCoreProvider>
      </ThemeProvider>
    </AuthGate>
  );
}

function RootDrawer() {
  const router = useRouter();
  const { isOpen, openDrawer, closeDrawer } = useDrawer();

  useSystemBackgroundColor();

  return (
    <DrawerLayout
      open={isOpen}
      onOpen={openDrawer}
      onClose={closeDrawer}
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
        headerTransparent: GLASS,
        headerBackButtonDisplayMode: GLASS ? "minimal" : "default",
        headerTintColor: appForeground,
        headerShadowVisible: IS_ANDROID ? false : undefined,
        headerStyle: IS_ANDROID
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
          title: "Add to chat",
          presentation: "formSheet",
          sheetAllowedDetents: "fitToContents",
          sheetCornerRadius: IS_ANDROID ? 28 : undefined,
          sheetGrabberVisible: true,
          headerTransparent: GLASS,
          headerLargeTitleShadowVisible: false,
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
          headerTransparent: GLASS,
          headerLargeTitleShadowVisible: false,
        }}
      />

      <Stack.Screen
        name="(settings)"
        options={{
          presentation: IS_ANDROID ? undefined : "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
