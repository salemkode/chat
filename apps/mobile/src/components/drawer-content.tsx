import '@/global.css'

import { Icon } from '@/components/icon'
import { TouchableGlass } from '@/components/touchable-glass'
import { SafeAreaView } from '@/components/tw'
import { InfiniteScrollFooter } from '@/components/infinite-scroll-footer'
import { DrawerSearchBar, DrawerSearchResults } from '@/components/drawer/drawer-sidebar-search'
import { DrawerThreadRow } from '@/components/drawer/drawer-thread-row'
import { useSidebarSearch } from '@/hooks/use-sidebar-search'
import { useViewer } from '@/hooks/use-viewer'
import { selectThread, threadSelection$ } from '@/state/thread-selection'
import { api } from '@convex/_generated/api'
import { useMutation } from 'convex/react'
import { LegendList } from '@legendapp/list/react-native'
import { useSelector } from '@legendapp/state/react'
import { useChatProjects, useChatThreads, useChatCoreContext } from '@chat/core'
import type { ProjectSummary, ThreadSummary } from '@chat/core/types'
import { type Href, useSegments } from 'expo-router'
import { FolderOpen, Folder, Plus, SquarePen } from 'lucide-react-native'
import React, { createContext, use, useCallback, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'

const settingsPath = '/(app)/(settings)/settings' satisfies Href

type DrawerListRow =
  | { kind: 'loading' }
  | { kind: 'projectsHeader' }
  | {
      kind: 'project'
      project: ProjectSummary
      isExpanded: boolean
      threadCount: number
    }
  | { kind: 'projectThread'; projectId: string; thread: ThreadSummary }
  | { kind: 'projectsLoading' }
  | { kind: 'divider' }
  | { kind: 'thread'; thread: ThreadSummary }
  | { kind: 'threadsLoading' }

type DrawerContextValue = {
  isOpen: boolean
  canOpenDrawer: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const segments = useSegments()
  const [requestedOpen, setRequestedOpen] = useState(false)
  const canOpenDrawer = !segments.some((segment) => String(segment) === '(settings)')
  const isOpen = canOpenDrawer && requestedOpen
  const openDrawer = useCallback(() => {
    if (!canOpenDrawer) {
      return
    }
    setRequestedOpen(true)
  }, [canOpenDrawer])
  const closeDrawer = useCallback(() => setRequestedOpen(false), [])
  const value = useMemo(
    () => ({ isOpen, canOpenDrawer, openDrawer, closeDrawer }),
    [isOpen, canOpenDrawer, openDrawer, closeDrawer],
  )

  return <DrawerContext value={value}>{children}</DrawerContext>
}

export function useDrawer() {
  const context = use(DrawerContext)
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}

const DrawerHeader = React.memo(function DrawerHeader({
  onCreateProject,
  onNewChat,
}: {
  onCreateProject: () => void
  onNewChat: () => void
}) {
  return (
    <View className="px-4 pt-3 pb-1">
      <View className="items-center py-3">
        <Text className="text-lg font-semibold text-foreground">Chat</Text>
      </View>
      <Pressable
        onPress={onNewChat}
        className="mt-1 w-full rounded-xl bg-foreground px-4 py-3 active:opacity-85"
      >
        <View className="flex-row items-center justify-center gap-2">
          <Icon icon={SquarePen} className="w-4 h-4" colorClassName="accent-background" />
          <Text className="text-[15px] font-semibold text-background">New Chat</Text>
        </View>
      </Pressable>
      <View className="mt-2">
        <Pressable
          onPress={onCreateProject}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 active:bg-accent"
        >
          <View className="flex-row items-center gap-2">
            <Icon icon={Folder} className="w-4 h-4 text-muted-foreground" />
            <Text className="text-[15px] font-medium text-foreground">New Project</Text>
          </View>
        </Pressable>
      </View>
    </View>
  )
})

const DrawerErrorBanner = React.memo(function DrawerErrorBanner({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <Pressable
      onPress={onDismiss}
      className="mx-4 mb-2 px-3 py-2 rounded-[10px] bg-muted active:bg-accent"
    >
      <Text className="text-[13px] text-red-500">{message}</Text>
    </Pressable>
  )
})

const DrawerProjectRow = React.memo(function DrawerProjectRow({
  project,
  isExpanded,
  onToggle,
  onNewChatInProject,
  threadCount,
}: {
  project: ProjectSummary
  isExpanded: boolean
  onToggle: () => void
  onNewChatInProject: () => void
  threadCount: number
}) {
  return (
    <View className="mb-1">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center px-4 py-2 mx-2 rounded-[8px] active:bg-accent gap-1"
      >
        <Icon
          icon={isExpanded ? FolderOpen : Folder}
          className="w-4 h-4 shrink-0 text-muted-foreground pr-1"
        />
        <Text
          numberOfLines={1}
          className="flex-1 text-[13px] font-semibold text-foreground/80 pr-2"
        >
          {project.name}
        </Text>
        <Pressable
          onPress={(e) => {
            e.stopPropagation()
            onNewChatInProject()
          }}
          hitSlop={8}
          className="h-6 flex-row items-center gap-0.5 rounded-full px-1.5 active:bg-accent"
        >
          <Text className="text-[11px] tabular-nums text-muted-foreground">
            {threadCount > 0 ? threadCount : project.threadCount}
          </Text>
          <Icon icon={Plus} className="w-3.5 h-3.5 text-muted-foreground" />
        </Pressable>
      </Pressable>
    </View>
  )
})

const DrawerLoadingRow = React.memo(function DrawerLoadingRow() {
  return (
    <View className="items-center py-6">
      <ActivityIndicator size="small" />
    </View>
  )
})

const DrawerEmptyState = React.memo(function DrawerEmptyState({
  onNewChat,
}: {
  onNewChat: () => void
}) {
  return (
    <View className="items-center py-8 px-6 gap-2">
      <Text className="text-[15px] text-muted-foreground text-center">No chats yet</Text>
      <Pressable
        onPress={onNewChat}
        className="px-3 py-1.5 rounded-[10px] bg-accent active:bg-accent/80"
      >
        <Text className="text-[14px] text-foreground font-medium">New chat</Text>
      </Pressable>
    </View>
  )
})

const DrawerFooter = React.memo(function DrawerFooter({
  viewerInitials,
  viewerName,
  onSettings,
}: {
  viewerInitials: string
  viewerName: string
  onSettings: () => void
}) {
  return (
    <View
      className="flex-row items-center px-4 py-3 border-t border-border"
      style={{ borderTopWidth: StyleSheet.hairlineWidth }}
    >
      {Platform.OS === 'ios' ? (
        <TouchableGlass onPress={onSettings} className="self-start rounded-full active:opacity-60">
          <DrawerFooterPill viewerInitials={viewerInitials} viewerName={viewerName} />
        </TouchableGlass>
      ) : (
        <Pressable onPress={onSettings} className="self-start rounded-full active:opacity-60">
          <DrawerFooterPill viewerInitials={viewerInitials} viewerName={viewerName} />
        </Pressable>
      )}
    </View>
  )
})

const DrawerFooterPill = React.memo(function DrawerFooterPill({
  viewerInitials,
  viewerName,
}: {
  viewerInitials: string
  viewerName: string
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-full border border-border/50 bg-card px-3 py-1.5">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-background">
        <Text className="text-xs font-semibold text-foreground">{viewerInitials}</Text>
      </View>
      <Text numberOfLines={1} className="max-w-[132px] pr-0.5 text-[15px] text-foreground">
        {viewerName}
      </Text>
    </View>
  )
})

function useProjectCreateDialog(
  createProject: (args: { name: string; description?: string }) => Promise<unknown>,
) {
  return useCallback(() => {
    Alert.prompt(
      'New Project',
      'Enter a name for your project',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: (name?: string) => {
            const trimmed = name?.trim()
            if (trimmed) {
              createProject({ name: trimmed }).catch(() => {})
            }
          },
        },
      ],
      'plain-text',
    )
  }, [createProject])
}

function drawerRowKey(item: DrawerListRow) {
  switch (item.kind) {
    case 'loading':
      return 'loading'
    case 'projectsHeader':
      return 'projectsHeader'
    case 'project':
      return `project:${item.project.id}`
    case 'projectThread':
      return `projectThread:${item.projectId}:${item.thread.id}`
    case 'projectsLoading':
      return 'projectsLoading'
    case 'divider':
      return 'divider'
    case 'thread':
      return `thread:${item.thread.id}`
    case 'threadsLoading':
      return 'threadsLoading'
  }
}

function drawerRowType(item: DrawerListRow) {
  return item.kind
}

function isSelectedDrawerThread(item: DrawerListRow, selectedThreadId: string | undefined) {
  return (
    (item.kind === 'thread' || item.kind === 'projectThread') && selectedThreadId === item.thread.id
  )
}

function drawerRowsMatch(left: DrawerListRow, right: DrawerListRow) {
  if (left.kind !== right.kind) {
    return false
  }

  switch (left.kind) {
    case 'loading':
    case 'projectsHeader':
    case 'projectsLoading':
    case 'divider':
    case 'threadsLoading':
      return true
    case 'project':
      return (
        right.kind === 'project' &&
        left.project === right.project &&
        left.isExpanded === right.isExpanded &&
        left.threadCount === right.threadCount
      )
    case 'projectThread':
      return (
        right.kind === 'projectThread' &&
        left.projectId === right.projectId &&
        left.thread === right.thread
      )
    case 'thread':
      return right.kind === 'thread' && left.thread === right.thread
  }
}

type DrawerListItemProps = {
  item: DrawerListRow
  selectedThreadId: string | undefined
  isLoadingMoreProjects: boolean
  isLoadingMoreThreads: boolean
  onToggleProject: (projectId: string) => void
  onNewChatInProject: (projectId: string) => void
  onThreadPress: (thread: ThreadSummary) => void
  onPinThread: (thread: ThreadSummary) => void
  onRemoveFromProject: (thread: ThreadSummary) => void
  onDeleteThread: (thread: ThreadSummary) => void
}

const DrawerListItem = React.memo(
  function DrawerListItem({
    item,
    selectedThreadId,
    isLoadingMoreProjects,
    isLoadingMoreThreads,
    onToggleProject,
    onNewChatInProject,
    onThreadPress,
    onPinThread,
    onRemoveFromProject,
    onDeleteThread,
  }: DrawerListItemProps) {
    const handleToggleProject = useCallback(() => {
      if (item.kind === 'project') {
        onToggleProject(item.project.id)
      }
    }, [item, onToggleProject])

    const handleNewChatInProject = useCallback(() => {
      if (item.kind === 'project') {
        onNewChatInProject(item.project.id)
      }
    }, [item, onNewChatInProject])

    const handleThreadPress = useCallback(() => {
      if (item.kind === 'thread' || item.kind === 'projectThread') {
        onThreadPress(item.thread)
      }
    }, [item, onThreadPress])

    const handlePinThread = useCallback(() => {
      if (item.kind === 'thread' || item.kind === 'projectThread') {
        onPinThread(item.thread)
      }
    }, [item, onPinThread])

    const handleRemoveFromProject = useCallback(() => {
      if (item.kind === 'projectThread') {
        onRemoveFromProject(item.thread)
      }
    }, [item, onRemoveFromProject])

    const handleDeleteThread = useCallback(() => {
      if (item.kind === 'thread' || item.kind === 'projectThread') {
        onDeleteThread(item.thread)
      }
    }, [item, onDeleteThread])

    switch (item.kind) {
      case 'loading':
        return <DrawerLoadingRow />
      case 'projectsHeader':
        return (
          <Text className="text-[13px] font-semibold text-foreground/70 px-6 pt-5 pb-1.5">
            Projects
          </Text>
        )
      case 'project':
        return (
          <DrawerProjectRow
            project={item.project}
            isExpanded={item.isExpanded}
            onToggle={handleToggleProject}
            onNewChatInProject={handleNewChatInProject}
            threadCount={item.threadCount}
          />
        )
      case 'projectThread':
        return (
          <DrawerThreadRow
            thread={item.thread}
            nested
            active={selectedThreadId === item.thread.id}
            onPress={handleThreadPress}
            onPin={handlePinThread}
            onRemoveFromProject={handleRemoveFromProject}
            onDelete={handleDeleteThread}
          />
        )
      case 'projectsLoading':
        return (
          <InfiniteScrollFooter
            isLoadingMore={isLoadingMoreProjects}
            label="Loading more projects..."
          />
        )
      case 'divider':
        return <View className="mx-6 my-2 border-b border-border" />
      case 'thread':
        return (
          <DrawerThreadRow
            thread={item.thread}
            active={selectedThreadId === item.thread.id}
            onPress={handleThreadPress}
            onPin={handlePinThread}
            onDelete={handleDeleteThread}
          />
        )
      case 'threadsLoading':
        return (
          <InfiniteScrollFooter
            isLoadingMore={isLoadingMoreThreads}
            label="Loading more chats..."
          />
        )
    }
  },
  (prev, next) => {
    if (
      prev.isLoadingMoreProjects !== next.isLoadingMoreProjects ||
      prev.isLoadingMoreThreads !== next.isLoadingMoreThreads ||
      prev.onToggleProject !== next.onToggleProject ||
      prev.onNewChatInProject !== next.onNewChatInProject ||
      prev.onThreadPress !== next.onThreadPress ||
      prev.onPinThread !== next.onPinThread ||
      prev.onRemoveFromProject !== next.onRemoveFromProject ||
      prev.onDeleteThread !== next.onDeleteThread
    ) {
      return false
    }

    return (
      drawerRowsMatch(prev.item, next.item) &&
      isSelectedDrawerThread(prev.item, prev.selectedThreadId) ===
        isSelectedDrawerThread(next.item, next.selectedThreadId)
    )
  },
)

export function DrawerContent({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (path: Href) => void
  onOpenModal: (path: Href) => void
}) {
  const {
    projects,
    createProject,
    isLoading: isLoadingProjects,
    hasMore: hasMoreProjects,
    isLoadingMore: isLoadingMoreProjects,
    loadMore: loadMoreProjects,
  } = useChatProjects()
  const {
    threadsByProject,
    unfiledThreads,
    setPinned,
    deleteThread,
    isLoading,
    hasMore: hasMoreThreads,
    isLoadingMore: isLoadingMoreThreads,
    loadMore: loadMoreThreads,
  } = useChatThreads()
  const { setPendingProjectId } = useChatCoreContext()
  const viewer = useViewer()
  const selectedThreadId = useSelector(() => threadSelection$.selectedThreadId.get())
  const [error, setError] = useState<string | null>(null)
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({})
  const [searchActive, setSearchActive] = useState(false)
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    error: searchError,
    isSearching,
    reset: resetSearch,
  } = useSidebarSearch(searchActive)
  const removeThreadFromProject = useMutation(api.projects.removeThreadFromProject)

  const clearError = useCallback(() => setError(null), [])

  const showCreateProject = useProjectCreateDialog(createProject)

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjectIds((prev) => ({
      ...prev,
      [projectId]: !(prev[projectId] ?? true),
    }))
  }, [])

  const handlePin = useCallback(
    (thread: ThreadSummary) => {
      setPinned(thread.id, !thread.pinned)
        .then(clearError)
        .catch(() => setError(`Failed to ${thread.pinned ? 'unpin' : 'pin'} chat`))
    },
    [setPinned, clearError],
  )

  const confirmDelete = useCallback(
    (thread: ThreadSummary) => {
      Alert.alert('Delete Chat', `Delete "${thread.title || 'Untitled'}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteThread(thread.id)
              .then(() => {
                if (selectedThreadId === thread.id) {
                  selectThread(undefined)
                  onNavigate('/')
                }
                clearError()
              })
              .catch(() => setError('Failed to delete chat'))
          },
        },
      ])
    },
    [deleteThread, selectedThreadId, onNavigate, clearError],
  )

  const handleRemoveFromProject = useCallback(
    (thread: ThreadSummary) => {
      if (!thread.projectId) {
        return
      }
      Alert.alert(
        'Remove from project',
        `Remove "${thread.title || 'Untitled'}" from ${thread.projectName ?? 'this project'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeThreadFromProject({ threadId: thread.id })
                .then(clearError)
                .catch(() => setError('Failed to remove chat from project'))
            },
          },
        ],
      )
    },
    [removeThreadFromProject, clearError],
  )

  const handleNewChat = useCallback(() => {
    selectThread(undefined)
    setPendingProjectId(null)
    onNavigate('/')
  }, [onNavigate, setPendingProjectId])

  const handleNewChatInProject = useCallback(
    (projectId: string) => {
      selectThread(undefined)
      setPendingProjectId(projectId)
      onNavigate('/')
    },
    [onNavigate, setPendingProjectId],
  )

  const handleThreadPress = useCallback(
    (thread: ThreadSummary) => {
      selectThread(thread.id)
      setPendingProjectId(null)
      onNavigate('/')
    },
    [onNavigate, setPendingProjectId],
  )

  const handleCancelSearch = useCallback(() => {
    setSearchActive(false)
    resetSearch()
  }, [resetSearch])

  const handleSelectSearchResult = useCallback(
    (threadId: string) => {
      selectThread(threadId)
      setPendingProjectId(null)
      handleCancelSearch()
      onNavigate('/')
    },
    [handleCancelSearch, onNavigate, setPendingProjectId],
  )

  const activateSearch = useCallback(() => setSearchActive(true), [])
  const openSettings = useCallback(() => {
    onOpenModal(settingsPath)
  }, [onOpenModal])

  const viewerName = viewer?.name
  const userInitials = useMemo(() => {
    if (!viewerName) {
      return '??'
    }

    return viewerName
      .split(' ')
      .map((namePart: string) => namePart[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [viewerName])

  const hasProjects = projects.length > 0
  const drawerRows = useMemo<DrawerListRow[]>(() => {
    if (isLoading || isLoadingProjects) {
      return [{ kind: 'loading' }]
    }

    const rows: DrawerListRow[] = []
    if (hasProjects) {
      rows.push({ kind: 'projectsHeader' })
      for (const project of projects) {
        const isExpanded = expandedProjectIds[project.id] ?? true
        const projectThreads = threadsByProject.get(project.id) ?? []
        rows.push({
          kind: 'project',
          project,
          isExpanded,
          threadCount: projectThreads.length > 0 ? projectThreads.length : project.threadCount,
        })
        if (isExpanded) {
          rows.push(
            ...projectThreads.map(
              (thread) =>
                ({
                  kind: 'projectThread',
                  projectId: project.id,
                  thread,
                }) satisfies DrawerListRow,
            ),
          )
        }
      }
      if (isLoadingMoreProjects) {
        rows.push({ kind: 'projectsLoading' })
      }
      if (unfiledThreads.length > 0) {
        rows.push({ kind: 'divider' })
      }
    }

    rows.push(
      ...unfiledThreads.map((thread) => ({ kind: 'thread', thread }) satisfies DrawerListRow),
    )
    if (isLoadingMoreThreads) {
      rows.push({ kind: 'threadsLoading' })
    }

    return rows
  }, [
    hasProjects,
    isLoading,
    isLoadingProjects,
    isLoadingMoreProjects,
    isLoadingMoreThreads,
    projects,
    expandedProjectIds,
    threadsByProject,
    unfiledThreads,
  ])

  const hasMoreDrawerRows = hasMoreProjects || hasMoreThreads
  const isLoadingMoreDrawerRows = isLoadingMoreProjects || isLoadingMoreThreads
  const loadMoreDrawerRows = useCallback(() => {
    if (hasMoreProjects && !isLoadingMoreProjects) {
      loadMoreProjects(30)
      return
    }
    if (hasMoreThreads && !isLoadingMoreThreads) {
      loadMoreThreads(30)
    }
  }, [
    hasMoreProjects,
    hasMoreThreads,
    isLoadingMoreProjects,
    isLoadingMoreThreads,
    loadMoreProjects,
    loadMoreThreads,
  ])

  const renderDrawerItem = useCallback(
    ({ item }: { item: DrawerListRow }) => (
      <DrawerListItem
        item={item}
        selectedThreadId={selectedThreadId}
        isLoadingMoreProjects={isLoadingMoreProjects}
        isLoadingMoreThreads={isLoadingMoreThreads}
        onToggleProject={toggleProject}
        onNewChatInProject={handleNewChatInProject}
        onThreadPress={handleThreadPress}
        onPinThread={handlePin}
        onRemoveFromProject={handleRemoveFromProject}
        onDeleteThread={confirmDelete}
      />
    ),
    [
      confirmDelete,
      handleNewChatInProject,
      handlePin,
      handleRemoveFromProject,
      handleThreadPress,
      isLoadingMoreProjects,
      isLoadingMoreThreads,
      selectedThreadId,
      toggleProject,
    ],
  )

  const searchResultsHeader = useMemo(() => {
    if (!searchActive) {
      return null
    }

    return (
      <DrawerSearchResults
        query={searchQuery}
        isSearching={isSearching}
        error={searchError}
        results={searchResults}
        onSelectThread={handleSelectSearchResult}
      />
    )
  }, [handleSelectSearchResult, isSearching, searchActive, searchError, searchQuery, searchResults])

  const emptyDrawerState = useMemo(() => {
    if (searchActive || isLoading || isLoadingProjects) {
      return null
    }

    return <DrawerEmptyState onNewChat={handleNewChat} />
  }, [handleNewChat, isLoading, isLoadingProjects, searchActive])

  return (
    <SafeAreaView className="flex-1" edges={['top', 'bottom', 'left']}>
      <DrawerHeader onCreateProject={showCreateProject} onNewChat={handleNewChat} />

      <View className="px-4 pb-3">
        <DrawerSearchBar
          active={searchActive}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onActivate={activateSearch}
          onCancel={handleCancelSearch}
        />
      </View>

      {error && <DrawerErrorBanner message={error} onDismiss={clearError} />}

      <LegendList
        className="flex-1"
        data={searchActive ? [] : drawerRows}
        keyExtractor={drawerRowKey}
        getItemType={drawerRowType}
        estimatedItemSize={52}
        contentContainerStyle={{ paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{
          data: true,
          size: true,
        }}
        onEndReached={
          !searchActive && hasMoreDrawerRows && !isLoadingMoreDrawerRows
            ? loadMoreDrawerRows
            : undefined
        }
        onEndReachedThreshold={0.35}
        renderItem={renderDrawerItem}
        ListHeaderComponent={searchResultsHeader}
        ListEmptyComponent={emptyDrawerState}
      />

      <DrawerFooter
        viewerInitials={userInitials}
        viewerName={viewerName || 'Loading...'}
        onSettings={openSettings}
      />
    </SafeAreaView>
  )
}
