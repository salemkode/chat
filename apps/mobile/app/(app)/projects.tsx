import { Redirect } from 'expo-router'

export default function ProjectsRouteRedirect() {
  return <Redirect href="/chats?tab=projects" />
}
