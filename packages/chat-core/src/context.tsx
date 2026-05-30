import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { resolveChatSnapshot } from './cache/resolve-snapshot'
import type { ProjectSummary, ThreadSummary } from './types'
import { compareThreadsForSidebar } from './sidebar'

type PaginatedQueryRef = Parameters<typeof usePaginatedQuery>[0]
type MutationRef = Parameters<typeof useMutation>[0]

export type ChatCoreApiRefs = {
  projects: {
    listProjects: PaginatedQueryRef
    createProject: MutationRef
    assignThreadToProject: MutationRef
  }
  agents: {
    listThreadsWithMetadata: PaginatedQueryRef
    setThreadPinned: MutationRef
  }
  chat: {
    deleteThread: MutationRef
  }
}

export type ChatCoreContextValue = {
  projects: ProjectSummary[]
  threads: ThreadSummary[]
  createProject: (args: { name: string; description?: string }) => Promise<unknown>
  assignThreadToProject: (threadId: string, projectId: string) => Promise<void>
  setPinned: (threadId: string, pinned: boolean) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  isOnline: boolean
  isLoadingProjects: boolean
  isLoadingThreads: boolean
  hasMoreProjects: boolean
  hasMoreThreads: boolean
  isLoadingMoreProjects: boolean
  isLoadingMoreThreads: boolean
  loadMoreProjects: (numItems?: number) => void
  loadMoreThreads: (numItems?: number) => void
  pendingProjectId: string | null
  setPendingProjectId: (id: string | null) => void
}

const ChatCoreContext = createContext<ChatCoreContextValue | null>(null)

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function getRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => asRecord(item) !== null) : []
}

function normalizeProject(raw: Record<string, unknown>): ProjectSummary {
  return {
    id: getString(raw.id) ?? '',
    name: getString(raw.name) ?? '',
    description: getString(raw.description),
    visibility: getString(raw.visibility),
    role: getString(raw.role),
    threadCount: getNumber(raw.threadCount) ?? 0,
    createdAt: getNumber(raw.createdAt) ?? 0,
    updatedAt: getNumber(raw.updatedAt) ?? 0,
  }
}

function normalizeThread(raw: Record<string, unknown>): ThreadSummary {
  const metadata = asRecord(raw.metadata)
  const project = asRecord(raw.project)
  const sortOrder = getNumber(metadata?.sortOrder) ?? 0
  return {
    id: getString(raw._id) ?? '',
    title: getString(raw.title),
    emoji: getString(metadata?.emoji) || '💬',
    icon: getString(metadata?.icon),
    projectId: getString(project?.id),
    projectName: getString(project?.name),
    sortOrder,
    pinned: sortOrder > 0,
    lastMessageAt: getNumber(raw.lastMessageAt) ?? getNumber(raw._creationTime) ?? 0,
    createdAt: getNumber(raw._creationTime),
  }
}

export type ChatCoreCacheAccessors = {
  readCachedThreads?: () => ThreadSummary[] | null
  readCachedProjects?: () => ProjectSummary[] | null
  writeCachedThreads?: (threads: ThreadSummary[]) => void
  writeCachedProjects?: (projects: ProjectSummary[]) => void
  deleteCachedThread?: (threadId: string) => void | Promise<void>
}

export function ChatCoreProvider({
  apiRefs,
  isOnline = true,
  cacheAccessors,
  cacheRevision = 0,
  children,
}: {
  apiRefs: ChatCoreApiRefs
  isOnline?: boolean
  cacheAccessors?: ChatCoreCacheAccessors
  /** Bump when platform offline cache changes so cached fallbacks re-read. */
  cacheRevision?: number
  children: React.ReactNode
}) {
  const liveProjectsQuery = usePaginatedQuery(apiRefs.projects.listProjects, {}, { initialNumItems: 30 })
  const liveThreadsQuery = usePaginatedQuery(
    apiRefs.agents.listThreadsWithMetadata,
    {},
    { initialNumItems: 30 },
  )
  const createProjectMutation = useMutation(apiRefs.projects.createProject)
  const assignThreadToProjectMutation = useMutation(apiRefs.projects.assignThreadToProject)
  const setThreadPinnedMutation = useMutation(apiRefs.agents.setThreadPinned)
  const deleteThreadMutation = useMutation(apiRefs.chat.deleteThread)

  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)

  const cachedProjects = useMemo(
    () => cacheAccessors?.readCachedProjects?.() ?? null,
    [cacheAccessors, cacheRevision],
  )
  const cachedThreads = useMemo(
    () => cacheAccessors?.readCachedThreads?.() ?? null,
    [cacheAccessors, cacheRevision],
  )

  const projects = useMemo<ProjectSummary[]>(() => {
    const normalized =
      liveProjectsQuery.results === undefined
        ? undefined
        : getRecordArray(liveProjectsQuery.results).map(normalizeProject)
    return resolveChatSnapshot({
      live: normalized,
      persisted: cachedProjects ?? [],
    })
  }, [cachedProjects, liveProjectsQuery.results])

  const threads = useMemo<ThreadSummary[]>(() => {
    const normalized =
      liveThreadsQuery.results === undefined
        ? undefined
        : [...getRecordArray(liveThreadsQuery.results)]
            .map(normalizeThread)
            .sort(compareThreadsForSidebar)
    return resolveChatSnapshot({
      live: normalized,
      persisted: cachedThreads ?? [],
    })
  }, [cachedThreads, liveThreadsQuery.results])

  useEffect(() => {
    if (liveProjectsQuery.results === undefined || !cacheAccessors?.writeCachedProjects) {
      return
    }
    cacheAccessors.writeCachedProjects(
      getRecordArray(liveProjectsQuery.results).map(normalizeProject),
    )
  }, [cacheAccessors, liveProjectsQuery.results])

  useEffect(() => {
    if (liveThreadsQuery.results === undefined || !cacheAccessors?.writeCachedThreads) {
      return
    }
    cacheAccessors.writeCachedThreads(
      [...getRecordArray(liveThreadsQuery.results)]
        .map(normalizeThread)
        .sort(compareThreadsForSidebar),
    )
  }, [cacheAccessors, liveThreadsQuery.results])

  const createProject = useCallback(
    async (args: { name: string; description?: string }) => {
      if (!isOnline) return null
      return await createProjectMutation(args)
    },
    [createProjectMutation, isOnline],
  )

  const assignThreadToProject = useCallback(
    async (threadId: string, projectId: string) => {
      if (!isOnline) return
      await assignThreadToProjectMutation({ threadId, projectId })
    },
    [assignThreadToProjectMutation, isOnline],
  )

  const setPinned = useCallback(
    async (threadId: string, pinned: boolean) => {
      if (!isOnline) return
      await setThreadPinnedMutation({ threadId, pinned })
    },
    [setThreadPinnedMutation, isOnline],
  )

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!isOnline) return
      await deleteThreadMutation({ threadId })
      await cacheAccessors?.deleteCachedThread?.(threadId)
    },
    [cacheAccessors, deleteThreadMutation, isOnline],
  )

  const value = useMemo<ChatCoreContextValue>(
    () => ({
      projects,
      threads,
      createProject,
      assignThreadToProject,
      setPinned,
      deleteThread,
      isOnline,
      isLoadingProjects: liveProjectsQuery.results === undefined,
      isLoadingThreads: liveThreadsQuery.results === undefined,
      hasMoreProjects:
        liveProjectsQuery.status === 'CanLoadMore' || liveProjectsQuery.status === 'LoadingMore',
      hasMoreThreads:
        liveThreadsQuery.status === 'CanLoadMore' || liveThreadsQuery.status === 'LoadingMore',
      isLoadingMoreProjects: liveProjectsQuery.status === 'LoadingMore',
      isLoadingMoreThreads: liveThreadsQuery.status === 'LoadingMore',
      loadMoreProjects: (numItems = 30) => liveProjectsQuery.loadMore(numItems),
      loadMoreThreads: (numItems = 30) => liveThreadsQuery.loadMore(numItems),
      pendingProjectId,
      setPendingProjectId,
    }),
    [
      projects,
      threads,
      createProject,
      assignThreadToProject,
      setPinned,
      deleteThread,
      isOnline,
      liveProjectsQuery.loadMore,
      liveProjectsQuery.results,
      liveProjectsQuery.status,
      liveThreadsQuery.loadMore,
      liveThreadsQuery.results,
      liveThreadsQuery.status,
      pendingProjectId,
    ],
  )

  return <ChatCoreContext value={value}>{children}</ChatCoreContext>
}

export function useChatCoreContext() {
  const ctx = useContext(ChatCoreContext)
  if (!ctx) {
    throw new Error('useChatCoreContext must be used within a ChatCoreProvider')
  }
  return ctx
}
