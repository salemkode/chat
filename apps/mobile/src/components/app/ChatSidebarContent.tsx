import { Ionicons } from '@expo/vector-icons'
import { LegendList } from '@legendapp/list/react-native'
import { type Href, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProjects } from '../../mobile-data/use-projects'
import { useThreads } from '../../mobile-data/use-threads'

type SidebarListItem =
  | { id: string; type: 'section'; label: string }
  | {
      id: string
      type: 'project'
      project: ReturnType<typeof useProjects>['projects'][number]
    }
  | { id: string; type: 'chat'; thread: ReturnType<typeof useThreads>['threads'][number] }
  | {
      id: string
      type: 'nav'
      label: string
      icon: keyof typeof Ionicons.glyphMap
      href: Href
    }
  | { id: string; type: 'empty'; text: string }

export function ChatSidebarContent({
  activeThreadId,
  closeSidebar,
}: {
  activeThreadId: string | null
  closeSidebar: () => void
}) {
  const router = useRouter()
  const { threads } = useThreads()
  const { projects } = useProjects()
  const [searchValue, setSearchValue] = useState('')

  const filteredThreads = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return threads
    return threads.filter((thread) =>
      (thread.title || 'Untitled chat').toLowerCase().includes(query),
    )
  }, [searchValue, threads])

  const listItems = useMemo<SidebarListItem[]>(() => {
    const items: SidebarListItem[] = [
      { id: 'section-projects', type: 'section', label: 'Projects' },
    ]

    if (projects.length) {
      items.push(
        ...projects.map((project) => ({
          id: `project-${project.id}`,
          type: 'project' as const,
          project,
        })),
      )
    } else {
      items.push({ id: 'empty-projects', type: 'empty', text: 'No projects yet.' })
    }

    items.push({ id: 'section-chats', type: 'section', label: 'Chats' })

    if (filteredThreads.length) {
      items.push(
        ...filteredThreads.map((thread) => ({
          id: `thread-${thread.id}`,
          type: 'chat' as const,
          thread,
        })),
      )
    } else {
      items.push({
        id: 'empty-chats',
        type: 'empty',
        text: searchValue.trim() ? 'No matching chats.' : 'No chats yet.',
      })
    }

    items.push(
      { id: 'section-account', type: 'section', label: 'Account' },
      {
        id: 'nav-projects',
        type: 'nav',
        label: 'Projects',
        icon: 'folder-open-outline',
        href: '/chats?tab=projects',
      },
      {
        id: 'nav-profile',
        type: 'nav',
        label: 'Profile',
        icon: 'person-outline',
        href: '/chats?tab=profile',
      },
    )

    return items
  }, [filteredThreads, projects, searchValue])

  const navigateTo = (href: Href) => {
    closeSidebar()
    router.replace(href)
  }

  const goNewChat = () => {
    closeSidebar()
    router.replace('/chats')
  }

  const goImageGenerator = () => {
    closeSidebar()
    router.push('../image-generator')
  }

  const goThread = (id: string) => {
    closeSidebar()
    router.replace(`/chat/${id}`)
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      className="flex-1 bg-background px-5 pb-4 pt-2"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="font-sans text-[22px] text-foreground"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Navigation
        </Text>
        <Pressable
          onPress={closeSidebar}
          className="size-11 items-center justify-center rounded-full bg-card active:opacity-80"
          accessibilityLabel="Close sidebar"
        >
          <Ionicons name="close" size={22} color="#f5f5f5" />
        </Pressable>
      </View>

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
          onPress={goNewChat}
          className="size-12 items-center justify-center rounded-full border border-primary bg-primary active:opacity-80"
          accessibilityLabel="New chat"
        >
          <Ionicons name="create-outline" size={20} color="#030712" />
        </Pressable>
      </View>

      <Pressable
        onPress={goImageGenerator}
        className="mb-5 flex-row items-center justify-between rounded-[24px] border border-[#2f3138] bg-card px-4 py-4 active:opacity-80"
      >
        <View className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-full bg-[#22232a]">
            <Ionicons name="color-wand-outline" size={20} color="#f5f5f5" />
          </View>
          <View>
            <Text
              className="font-sans text-[17px] text-foreground"
              style={{ fontFamily: 'Inter_600SemiBold' }}
            >
              Image Generator
            </Text>
            <Text className="font-sans text-[13px] text-foreground-secondary">
              Create visuals from a prompt
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#5b5d63" />
      </Pressable>

      <LegendList
        style={{ flex: 1 }}
        data={listItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        estimatedItemSize={64}
        getItemType={(item) => item.type}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          if (item.type === 'section') {
            return (
              <Text
                className="mb-3 mt-1 font-sans text-[13px] uppercase tracking-[1.2px] text-foreground-secondary"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {item.label}
              </Text>
            )
          }

          if (item.type === 'project') {
            return (
              <Pressable
                onPress={() => {
                  closeSidebar()
                  router.push(`/project/${item.project.id}`)
                }}
                className="mb-1 flex-row items-center justify-between rounded-2xl px-2 py-3 active:bg-card"
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-8 items-center justify-center rounded-full bg-card">
                    <Ionicons name="folder-open-outline" size={16} color="#f5f5f5" />
                  </View>
                  <Text className="font-sans text-[18px] text-foreground">
                    {item.project.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#5b5d63" />
              </Pressable>
            )
          }

          if (item.type === 'chat') {
            const isActive = item.thread.id === activeThreadId
            return (
              <Pressable
                onPress={() => goThread(item.thread.id)}
                className={`mb-1 flex-row items-center gap-2 rounded-2xl px-2 py-2.5 active:bg-card ${isActive ? 'bg-card' : ''}`}
              >
                {item.thread.pinned ? (
                  <Ionicons name="bookmark" size={14} color="#9a9ca3" />
                ) : null}
                <Text
                  numberOfLines={1}
                  className="flex-1 font-sans text-[18px] text-foreground"
                >
                  {item.thread.title || 'Untitled chat'}
                </Text>
              </Pressable>
            )
          }

          if (item.type === 'nav') {
            return (
              <Pressable
                onPress={() => navigateTo(item.href)}
                className="mb-1 flex-row items-center justify-between rounded-2xl px-2 py-3 active:bg-card"
              >
                <View className="flex-row items-center gap-3">
                  <View className="size-8 items-center justify-center rounded-full bg-card">
                    <Ionicons name={item.icon} size={16} color="#f5f5f5" />
                  </View>
                  <Text className="font-sans text-[18px] text-foreground">{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#5b5d63" />
              </Pressable>
            )
          }

          return (
            <Text className="mb-6 font-sans text-[15px] text-foreground-secondary">
              {item.text}
            </Text>
          )
        }}
      />
    </SafeAreaView>
  )
}
