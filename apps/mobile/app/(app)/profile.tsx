import { Redirect } from 'expo-router'

export default function ProfileRouteRedirect() {
  return <Redirect href="/chats?tab=profile" />
}
