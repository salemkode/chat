import { AndroidGrabber } from '@/components/grabber'
import { InfiniteScrollFooter } from '@/components/infinite-scroll-footer'
import { Icon } from '@/components/icon'
import type { ProjectSummary } from '@chat/core/types'
import { LegendList } from '@legendapp/list/react-native'
import { Check } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type ProjectPickerContentProps = {
  projects: ProjectSummary[]
  selectedProjectId: string | null
  onSelectProject: (projectId: string | null) => void
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}

type ProjectPickerRow = { kind: 'none' } | { kind: 'project'; project: ProjectSummary }

function ProjectRow({
  label,
  subtitle,
  selected,
  onPress,
}: {
  label: string
  subtitle?: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-5 py-3 active:bg-muted">
      <View className="w-5 items-center">
        {selected ? <Icon icon={Check} className="size-5 text-foreground" /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] text-foreground" numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

function ProjectPickerListItem({
  item,
  selectedProjectId,
  onSelectProject,
}: {
  item: ProjectPickerRow
  selectedProjectId: string | null
  onSelectProject: (projectId: string | null) => void
}) {
  function selectNoProject() {
    onSelectProject(null)
  }

  function selectProject() {
    if (item.kind === 'project') {
      onSelectProject(item.project.id)
    }
  }

  if (item.kind === 'none') {
    return (
      <ProjectRow label="None" selected={selectedProjectId === null} onPress={selectNoProject} />
    )
  }

  return (
    <ProjectRow
      label={item.project.name}
      subtitle={item.project.description}
      selected={selectedProjectId === item.project.id}
      onPress={selectProject}
    />
  )
}

export function ProjectPickerContent({
  projects,
  selectedProjectId,
  onSelectProject,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ProjectPickerContentProps) {
  const insets = useSafeAreaInsets()
  const rows: ProjectPickerRow[] = [
    { kind: 'none' },
    ...projects.map((project) => ({ kind: 'project', project }) satisfies ProjectPickerRow),
  ]

  function renderProjectItem({ item }: { item: ProjectPickerRow }) {
    return (
      <ProjectPickerListItem
        item={item}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
      />
    )
  }

  return (
    <LegendList
      className="flex-1"
      data={rows}
      keyExtractor={(item) => (item.kind === 'none' ? 'none' : item.project.id)}
      estimatedItemSize={58}
      contentContainerStyle={{
        paddingBottom: process.env.EXPO_OS === 'android' ? insets.bottom : undefined,
      }}
      onEndReached={hasMore && !isLoadingMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.35}
      renderItem={renderProjectItem}
      ListHeaderComponent={<AndroidGrabber />}
      ListFooterComponent={
        <>
          {projects.length === 0 ? (
            <View className="px-5 py-4">
              <Text className="text-[15px] text-muted-foreground">
                Create a project from the sidebar to organize chats.
              </Text>
            </View>
          ) : null}
          <InfiniteScrollFooter isLoadingMore={isLoadingMore} label="Loading more projects..." />
        </>
      }
    />
  )
}
