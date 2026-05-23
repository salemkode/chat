import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { resolveChatSnapshot } from './cache/resolve-snapshot'
import type { ProjectSummary, ThreadSummary } from './types'
import { compareThreadsForSidebar } from './sidebar'

export type ChatCoreApiRefs = {
  projects: {
    listProjects: unknown
    createProject: unknown
    assignThreadToProject: unknown
  }
  agents: {
    listThreadsWithMetadata: unknown
    setThreadPinned: unknown
  }
  chat: {
    deleteThread: unknown
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

function normalizeProject(raw: Record<string, unknown>): ProjectSummary {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: raw.description as string | undefined,
    visibility: raw.visibility as string | undefined,
    role: raw.role as string | undefined,
    threadCount: (raw.threadCount as number) ?? 0,
    createdAt: raw.createdAt as number,
    updatedAt: raw.updatedAt as number,
  }
}

function normalizeThread(raw: Record<string, unknown>): ThreadSummary {
  const metadata = raw.metadata as Record<string, unknown> | undefined
  const project = raw.project as
    | { id: string; name: string; description?: string }
    | null
    | undefined
  const sortOrder = (metadata?.sortOrder as number) ?? 0
  return {
    id: raw._id as string,
    title: raw.title as string | undefined,
    emoji: (metadata?.emoji as string) || '💬',
    icon: metadata?.icon as string | undefined,
    projectId: project?.id,
    projectName: project?.name,
    sortOrder,
    pinned: sortOrder > 0,
    lastMessageAt:
      (raw.lastMessageAt as number) ?? (raw._creationTime as number),
    createdAt: raw._creationTime as number,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refs = apiRefs as any

  const liveProjectsQuery = usePaginatedQuery(refs.projects.listProjects, {}, { initialNumItems: 30 })
  const liveThreadsQuery = usePaginatedQuery(
    refs.agents.listThreadsWithMetadata,
    {},
    { initialNumItems: 30 },
  )
  const createProjectMutation = useMutation(refs.projects.createProject)
  const assignThreadToProjectMutation = useMutation(refs.projects.assignThreadToProject)
  const setThreadPinnedMutation = useMutation(refs.agents.setThreadPinned)
  const deleteThreadMutation = useMutation(refs.chat.deleteThread)

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
        : (liveProjectsQuery.results as Record<string, unknown>[]).map(normalizeProject)
    return resolveChatSnapshot({
      live: normalized,
      persisted: cachedProjects ?? [],
    })
  }, [cachedProjects, liveProjectsQuery.results])

  const threads = useMemo<ThreadSummary[]>(() => {
    const normalized =
      liveThreadsQuery.results === undefined
        ? undefined
        : [...(liveThreadsQuery.results as Record<string, unknown>[])]
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
      (liveProjectsQuery.results as Record<string, unknown>[]).map(normalizeProject),
    )
  }, [cacheAccessors, liveProjectsQuery.results])

  useEffect(() => {
    if (liveThreadsQuery.results === undefined || !cacheAccessors?.writeCachedThreads) {
      return
    }
    cacheAccessors.writeCachedThreads(
      [...(liveThreadsQuery.results as Record<string, unknown>[])]
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
