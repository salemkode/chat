import { DrawerContent, DrawerProvider, useDrawer } from '@/components/drawer-content'
import { DrawerLayout } from '@/components/drawer-layout'
import { AuthGate } from '@/components/auth-gate'
import { ChatAttachmentsProvider } from '@/components/chat/attachment-context'
import { ChatComposerOptionsProvider } from '@/components/chat/composer-options-context'
import { ComposerToastProvider } from '@/components/composer-toast'
import { ModelProvider } from '@/components/model-context'
import { hydrateThreadSelection } from '@/state/thread-selection'
import { useSystemBackgroundColor } from '@/utils/use-system-background-color'
import { Stack, useRouter } from 'expo-router'
import { DefaultTheme, ThemeProvider as RouterThemeProvider } from 'expo-router/react-navigation'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useCSSVariable } from 'uniwind'
import { OfflineSessionSync } from '@/components/offline-session-sync'
import { MobileChatCoreProvider } from '@/components/mobile-chat-core-provider'
import { ShareIntentBridge } from '@/components/share-intent-bridge'

function ThemeProvider(props: { children: React.ReactNode }) {
  return <RouterThemeProvider value={DefaultTheme}>{props.children}</RouterThemeProvider>
}

export default function AppLayout() {
  useEffect(() => {
    void hydrateThreadSelection()
  }, [])

  return (
    <AuthGate>
      <ThemeProvider>
        <MobileChatCoreProvider>
          <OfflineSessionSync />
          <ModelProvider>
            <ChatComposerOptionsProvider>
              <ChatAttachmentsProvider>
                <ShareIntentBridge />
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
  )
}

function RootDrawer() {
  const router = useRouter()
  const { isOpen, canOpenDrawer, openDrawer, closeDrawer } = useDrawer()

  useSystemBackgroundColor()

  return (
    <DrawerLayout
      open={isOpen}
      onOpen={openDrawer}
      onClose={closeDrawer}
      swipeEnabled={canOpenDrawer}
      drawerContent={
        <DrawerContent
          onNavigate={(path) => {
            closeDrawer()
            router.replace(path, { withAnchor: true })
          }}
          onOpenModal={(path) => {
            router.navigate(path)
          }}
        />
      }
    >
      <StackLayout />
    </DrawerLayout>
  )
}

function StackLayout() {
  const appBackgroundValue = useCSSVariable('--app-background')
  const appBackground = typeof appBackgroundValue === 'string' ? appBackgroundValue : undefined

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: appBackground,
        },
      }}
    >
      <Stack.Screen
        name="index"
        dangerouslySingular
        options={{
          animation: 'none',
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="chats"
        options={{
          animation: 'none',
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="attachments"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.55],
          sheetCornerRadius: process.env.EXPO_OS === 'android' ? 28 : undefined,
          sheetGrabberVisible: true,
        }}
      />

      <Stack.Screen
        name="model-picker"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetCornerRadius: process.env.EXPO_OS === 'android' ? 28 : undefined,
          sheetGrabberVisible: true,
        }}
      />

      <Stack.Screen name="(settings)" />
    </Stack>
  )
}
