import { Ionicons } from '@expo/vector-icons'
import type { DrawerContentComponentProps } from '@react-navigation/drawer'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProjects } from '../../mobile-data/use-projects'
import { useThreads } from '../../mobile-data/use-threads'

export function ChatDrawerContent({ navigation }: DrawerContentComponentProps) {
  const router = useRouter()
  const { threads } = useThreads()
  const { projects } = useProjects()
  const [searchValue, setSearchValue] = useState('')
  const activeRoute = navigation.getState().routes[navigation.getState().index]
  const routeParams = (activeRoute?.params ?? {}) as { id?: string }
  const activeThreadId =
    activeRoute?.name === 'chat/[id]' && typeof routeParams.id === 'string'
      ? routeParams.id
      : null
  const isNewChatActive = activeRoute?.name === 'chats'

  const filteredThreads = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return threads
    return threads.filter((thread) => (thread.title || 'Untitled chat').toLowerCase().includes(query))
  }, [searchValue, threads])

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 border-r border-border bg-background px-5 pb-4 pt-2"
    >
      <View className="mb-4 flex-row items-center gap-3">
        <View className="flex-1 flex-row items-center rounded-full border border-border bg-elevated px-4">
          <Ionicons name="search-outline" size={18} color="#9a9ca3" />
          <TextInput
            value={searchValue}
            onChangeText={setSearchValue}
            placeholder="Search chats"
            placeholderTextColor="#9a9ca3"
            className="ml-3 flex-1 py-3 font-sans text-[17px] text-foreground"
          />
        </View>

        <Pressable
          onPress={() => {
            navigation.closeDrawer()
            router.replace('/chats')
          }}
          className={`size-12 items-center justify-center rounded-full border ${isNewChatActive ? 'border-primary bg-primary' : 'border-border bg-elevated'} active:opacity-80`}
          accessibilityLabel="New chat"
        >
          <Ionicons name="create-outline" size={20} color={isNewChatActive ? '#111827' : '#f5f5f5'} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text
          className="mb-3 font-sans text-[13px] uppercase tracking-[1.2px] text-foreground-secondary"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Projects
        </Text>

        {projects.length ? (
          <View className="mb-6 gap-1">
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  navigation.closeDrawer()
                  router.push(`/project/${project.id}`)
                }}
                className="flex-row items-center justify-between rounded-2xl px-2 py-3 active:bg-card"
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-8 items-center justify-center rounded-full bg-card">
                    <Ionicons name="folder-open-outline" size={16} color="#f5f5f5" />
                  </View>
                  <Text className="font-sans text-[18px] text-foreground">{project.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#5b5d63" />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text className="mb-6 font-sans text-[15px] text-foreground-secondary">No projects yet.</Text>
        )}

        <Text
          className="mb-3 font-sans text-[13px] uppercase tracking-[1.2px] text-foreground-secondary"
          style={{ fontFamily: 'Inter_500Medium' }}
        >
          Chats
        </Text>

        {filteredThreads.length ? (
          <View className="gap-1">
            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeThreadId
              return (
                <Pressable
                  key={thread.id}
                  onPress={() => {
                    navigation.closeDrawer()
                    router.replace(`/chat/${thread.id}`)
                  }}
                  className={`flex-row items-center gap-2 rounded-2xl px-2 py-2.5 active:bg-card ${isActive ? 'bg-card' : ''}`}
                >
                  {thread.pinned ? <Ionicons name="bookmark" size={14} color="#9a9ca3" /> : null}
                  <Text numberOfLines={1} className="flex-1 font-sans text-[18px] text-foreground">
                    {thread.title || 'Untitled chat'}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : (
          <Text className="font-sans text-[15px] text-foreground-secondary">
            {searchValue.trim() ? 'No matching chats.' : 'No chats yet.'}
          </Text>
        )}
      </ScrollView>

      <View className="mt-2 flex-row gap-2 border-t border-border pt-3">
        <Pressable
          onPress={() => {
            navigation.closeDrawer()
            router.push('/projects')
          }}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 active:bg-elevated"
        >
          <Ionicons name="folder-open-outline" size={16} color="#f5f5f5" />
          <Text className="font-sans text-[15px] text-foreground">Projects</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            navigation.closeDrawer()
            router.push('/profile')
          }}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 active:bg-elevated"
        >
          <Ionicons name="person-outline" size={16} color="#f5f5f5" />
          <Text className="font-sans text-[15px] text-foreground">Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
