import { Ionicons } from '@expo/vector-icons'
import { LegendList } from '@legendapp/list/react-native'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProjects } from '../../mobile-data/use-projects'
import { useThreads } from '../../mobile-data/use-threads'

type ThreadPickerListItem =
  | { id: string; type: 'section'; label: string }
  | {
      id: string
      type: 'project'
      project: ReturnType<typeof useProjects>['projects'][number]
    }
  | { id: string; type: 'chat'; thread: ReturnType<typeof useThreads>['threads'][number] }
  | { id: string; type: 'empty'; text: string }

export function ChatThreadPicker({
  activeThreadId,
  onClose,
  onJumpToProjectsTab,
  onJumpToProfileTab,
  isNewChatActive,
}: {
  activeThreadId: string | null
  onClose: () => void
  onJumpToProjectsTab: () => void
  onJumpToProfileTab: () => void
  isNewChatActive: boolean
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
  const listItems = useMemo<ThreadPickerListItem[]>(() => {
    const items: ThreadPickerListItem[] = [
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

    return items
  }, [filteredThreads, projects, searchValue])

  const goNewChat = () => {
    onClose()
    router.replace('/chats')
  }

  const goThread = (id: string) => {
    onClose()
    router.replace(`/chat/${id}`)
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 border-border bg-background px-5 pb-4 pt-2">
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className="font-sans text-[22px] text-foreground"
          style={{ fontFamily: 'Inter_600SemiBold' }}
        >
          Chats
        </Text>
        <Pressable
          onPress={onClose}
          className="size-11 items-center justify-center rounded-full bg-card active:opacity-80"
          accessibilityLabel="Close"
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
          className={`size-12 items-center justify-center rounded-full border ${isNewChatActive ? 'border-primary bg-primary' : 'border-border bg-elevated'} active:opacity-80`}
          accessibilityLabel="New chat"
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={isNewChatActive ? '#030712' : '#f5f5f5'}
          />
        </Pressable>
      </View>

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
                  onClose()
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

          return (
            <Text className="mb-6 font-sans text-[15px] text-foreground-secondary">
              {item.text}
            </Text>
          )
        }}
      />

      <View className="mt-2 flex-row gap-2 border-t border-border pt-3">
        <Pressable
          onPress={() => {
            onClose()
            onJumpToProjectsTab()
          }}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 active:bg-elevated"
        >
          <Ionicons name="folder-open-outline" size={16} color="#f5f5f5" />
          <Text className="font-sans text-[15px] text-foreground">Projects tab</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onClose()
            onJumpToProfileTab()
          }}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-3 active:bg-elevated"
        >
          <Ionicons name="person-outline" size={16} color="#f5f5f5" />
          <Text className="font-sans text-[15px] text-foreground">Profile tab</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
