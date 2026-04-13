import { useAuth } from '@clerk/expo'
import { Drawer } from 'expo-router/drawer'
import { Redirect } from 'expo-router'
import { ActivityIndicator, Dimensions, View } from 'react-native'
import { ChatDrawerContent } from '../../src/components/chat/chat-drawer-content'
import { useClerkLoadDebug } from '../../src/lib/clerk-debug'

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  useClerkLoadDebug('App layout', isLoaded)
  const drawerWidth = Math.min(380, Math.floor(Dimensions.get('window').width * 0.86))

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator colorClassName="accent-primary" />
      </View>
    )
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.55)',
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: '#0a0a0a',
          borderRightWidth: 0,
        },
        sceneStyle: { backgroundColor: '#0a0a0a' },
      }}
      drawerContent={(props) => <ChatDrawerContent {...props} />}
    >
      <Drawer.Screen name="chats" options={{ drawerLabel: 'Chats' }} />
      <Drawer.Screen
        name="chat/[id]"
        options={{ drawerLabel: () => null, drawerItemStyle: { height: 0 } }}
      />
      <Drawer.Screen
        name="projects"
        options={{ drawerLabel: () => null, drawerItemStyle: { height: 0 } }}
      />
      <Drawer.Screen
        name="profile"
        options={{ drawerLabel: () => null, drawerItemStyle: { height: 0 } }}
      />
      <Drawer.Screen
        name="project/[id]"
        options={{ drawerLabel: () => null, drawerItemStyle: { height: 0 } }}
      />
    </Drawer>
  )
}
