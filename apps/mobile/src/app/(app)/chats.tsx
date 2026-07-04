import { AppHeader, HeaderIconButton } from '@/components/app-header'
import { useDrawer } from '@/components/drawer-content'
import { Icon } from '@/components/icon'
import { InfiniteScrollFooter } from '@/components/infinite-scroll-footer'
import { Image } from '@/components/tw'
import { useThreads } from '@/hooks/use-threads'
import { selectThread } from '@/state/thread-selection'
import { LegendList } from '@legendapp/list/react-native'
import { useRouter } from 'expo-router'
import { Check, ChevronRight, Menu, Search, SquarePen, Star } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Filter = 'all' | 'starred'

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Today'
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  const weeks = Math.round(diffDays / 7)
  return `${weeks} week${weeks === 1 ? '' : 's'} ago`
}

function ChatRow({
  title,
  emoji,
  subtitle,
  onNavigate,
  onStar,
}: {
  title: string
  emoji: string
  subtitle: string
  onNavigate: () => void
  onStar: () => void
}) {
  return (
    <Pressable
      className="flex-row items-center px-5 py-4 active:bg-card"
      onPress={onNavigate}
      onLongPress={onStar}
    >
      <Text className="mr-3 text-lg">{emoji}</Text>
      <View className="mr-3 flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className="text-[17px] text-foreground dark:text-foreground"
          selectable
        >
          {title}
        </Text>
        <Text className="text-[13px] text-muted-foreground dark:text-muted-foreground">
          {subtitle}
        </Text>
      </View>
      {process.env.EXPO_OS === 'ios' ? (
        <Image
          source="sf:chevron.right"
          className="h-4 w-2.5 font-medium text-muted-foreground dark:text-muted-foreground"
        />
      ) : (
        <Icon
          icon={ChevronRight}
          className="h-4 w-2.5 text-muted-foreground dark:text-muted-foreground"
        />
      )}
    </Pressable>
  )
}

function EmptySearch({ query }: { query: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-2 pt-32">
      <Icon icon={Search} className="h-10 w-10 text-muted-foreground" />
      <Text className="px-10 text-center text-[17px] text-muted-foreground">
        No results found for &ldquo;{query}&rdquo;
      </Text>
    </View>
  )
}

function ChatsHeader({
  search,
  setSearch,
  filter,
  setFilter,
  onNewChat,
}: {
  search: string
  setSearch: (search: string) => void
  filter: Filter
  setFilter: (filter: Filter) => void
  onNewChat: () => void
}) {
  const { openDrawer } = useDrawer()

  return (
    <AppHeader
      testID="manual-chats-header"
      title="Chats"
      left={<HeaderIconButton icon={Menu} accessibilityLabel="Open drawer" onPress={openDrawer} />}
      right={
        <HeaderIconButton icon={SquarePen} accessibilityLabel="New chat" onPress={onNewChat} />
      }
      bottom={
        <View className="gap-3">
          <View className="h-11 flex-row items-center rounded-full border border-border bg-card px-3">
            <Icon icon={Search} className="h-4 w-4 text-muted-foreground" />
            <TextInput
              testID="chat-search-input"
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColorClassName="accent-muted-foreground"
              className="ml-2 flex-1 py-2 text-[15px] text-foreground"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                className="rounded-full px-2 py-1 active:bg-muted"
              >
                <Text className="text-[13px] font-medium text-muted-foreground">Clear</Text>
              </Pressable>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            <FilterButton
              label="All"
              active={filter === 'all'}
              icon={Check}
              onPress={() => setFilter('all')}
            />
            <FilterButton
              label="Starred"
              active={filter === 'starred'}
              icon={Star}
              onPress={() => setFilter('starred')}
            />
          </View>
        </View>
      }
    />
  )
}

function FilterButton({
  label,
  active,
  icon,
  onPress,
}: {
  label: string
  active: boolean
  icon: LucideIcon
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={
        active
          ? 'flex-row items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 py-1.5 active:opacity-80'
          : 'flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 active:bg-muted'
      }
    >
      <Icon
        icon={icon}
        className={active ? 'h-3.5 w-3.5 text-background' : 'h-3.5 w-3.5 text-muted-foreground'}
      />
      <Text
        className={
          active
            ? 'text-[13px] font-medium text-background'
            : 'text-[13px] font-medium text-foreground'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}

export default function ChatsScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const insets = useSafeAreaInsets()
  const { threads, setPinned, hasMore, isLoadingMore, loadMore } = useThreads()

  const filtered = useMemo(() => {
    let results = threads
    if (filter === 'starred') {
      results = results.filter((t) => t.pinned)
    }
    if (search) {
      const q = search.toLowerCase()
      results = results.filter((t) => t.title?.toLowerCase().includes(q))
    }
    return results
  }, [search, threads, filter])

  const onNewChat = () => {
    selectThread(undefined)
    router.navigate('/')
  }

  return (
    <View className="flex-1 bg-background">
      <ChatsHeader
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        onNewChat={onNewChat}
      />
      <LegendList
        className="flex-1 bg-background"
        data={filtered}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 16),
        }}
        renderItem={({ item }) => (
          <ChatRow
            title={item.title || 'Untitled'}
            emoji={item.emoji}
            subtitle={formatTimeAgo(item.lastMessageAt)}
            onNavigate={() => {
              selectThread(item.id)
              router.navigate('/')
            }}
            onStar={() => setPinned(item.id, !item.pinned)}
          />
        )}
        ListEmptyComponent={search ? <EmptySearch query={search} /> : null}
        ListFooterComponent={
          <InfiniteScrollFooter isLoadingMore={isLoadingMore} label="Loading more chats..." />
        }
        onEndReached={!search && hasMore && !isLoadingMore ? () => loadMore(30) : undefined}
        onEndReachedThreshold={0.35}
      />
    </View>
  )
}
