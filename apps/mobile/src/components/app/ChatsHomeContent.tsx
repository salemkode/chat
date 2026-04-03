import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { TabBar, TabView, type SceneRendererProps } from 'react-native-tab-view'
import { ChatPage } from '../chat'
import { ProfilePanel } from './ProfilePanel'
import { ProjectsPanel } from './ProjectsPanel'

type TabRoute = { key: 'chats' | 'projects' | 'profile'; title: string }

const routes: TabRoute[] = [
  { key: 'chats', title: 'Chat' },
  { key: 'projects', title: 'Projects' },
  { key: 'profile', title: 'Account' },
]

export function ChatsHomeContent({ onMenuPress }: { onMenuPress: () => void }) {
  const layout = useWindowDimensions()
  const router = useRouter()
  const { tab } = useLocalSearchParams<{ tab?: string }>()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (tab === 'projects') setIndex(1)
    else if (tab === 'profile') setIndex(2)
    else setIndex(0)
  }, [tab])

  const navigationState = useMemo(() => ({ index, routes }), [index])

  const renderScene = useCallback(
    ({ route }: SceneRendererProps & { route: TabRoute }) => {
      switch (route.key) {
        case 'chats':
          return (
            <ChatPage
              mode="new"
              onMenuPress={onMenuPress}
              onThreadCreated={(threadId) => {
                router.replace(`/chat/${threadId}`)
              }}
            />
          )
        case 'projects':
          return <ProjectsPanel />
        case 'profile':
          return (
            <ProfilePanel
              onOpenProjects={() => {
                setIndex(1)
              }}
            />
          )
        default:
          return <View className="flex-1 bg-background" />
      }
    },
    [onMenuPress, router],
  )

  return (
    <TabView
      navigationState={navigationState}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
      tabBarPosition="bottom"
      lazy
      lazyPreloadDistance={1}
      renderTabBar={(props) => (
        <TabBar
          {...props}
          style={{
            backgroundColor: '#0a0a0a',
            borderTopWidth: 1,
            borderTopColor: '#2f3138',
          }}
          indicatorStyle={{ backgroundColor: '#4a9cff', height: 2 }}
          activeColor="#f5f5f5"
          inactiveColor="#6b7280"
          pressColor="rgba(255,255,255,0.08)"
          options={Object.fromEntries(
            routes.map((route) => [
              route.key,
              {
                labelStyle: { fontSize: 13, fontFamily: 'Inter_500Medium' } as const,
              },
            ]),
          )}
        />
      )}
    />
  )
}
