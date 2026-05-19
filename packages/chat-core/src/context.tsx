import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
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

  const liveProjects = useQuery(refs.projects.listProjects, {})
  const liveThreads = useQuery(refs.agents.listThreadsWithMetadata, {})
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
      liveProjects === undefined
        ? undefined
        : (liveProjects as Record<string, unknown>[]).map(normalizeProject)
    return resolveChatSnapshot({
      live: normalized,
      persisted: cachedProjects ?? [],
    })
  }, [cachedProjects, liveProjects])

  const threads = useMemo<ThreadSummary[]>(() => {
    const normalized =
      liveThreads === undefined
        ? undefined
        : [...(liveThreads as Record<string, unknown>[])]
            .map(normalizeThread)
            .sort(compareThreadsForSidebar)
    return resolveChatSnapshot({
      live: normalized,
      persisted: cachedThreads ?? [],
    })
  }, [cachedThreads, liveThreads])

  useEffect(() => {
    if (!liveProjects || !cacheAccessors?.writeCachedProjects) {
      return
    }
    cacheAccessors.writeCachedProjects(
      (liveProjects as Record<string, unknown>[]).map(normalizeProject),
    )
  }, [cacheAccessors, liveProjects])

  useEffect(() => {
    if (!liveThreads || !cacheAccessors?.writeCachedThreads) {
      return
    }
    cacheAccessors.writeCachedThreads(
      [...(liveThreads as Record<string, unknown>[])]
        .map(normalizeThread)
        .sort(compareThreadsForSidebar),
    )
  }, [cacheAccessors, liveThreads])

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
    },
    [deleteThreadMutation, isOnline],
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
      isLoadingProjects: liveProjects === undefined,
      isLoadingThreads: liveThreads === undefined,
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
      liveProjects,
      liveThreads,
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
