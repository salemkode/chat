import { Stack } from 'expo-router'

export default function AttachmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="project-picker" />
    </Stack>
  )
}
