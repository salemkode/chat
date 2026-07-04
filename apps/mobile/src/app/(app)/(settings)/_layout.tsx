import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="settings" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="models" />
      <Stack.Screen name="memory" />
    </Stack>
  )
}
