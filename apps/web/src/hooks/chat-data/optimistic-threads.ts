import type { OptimisticLocalStore } from 'convex/browser'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'

type ThreadsWithMetadata = FunctionReturnType<typeof api.agents.listThreadsWithMetadata>['page']
type ThreadsPage = FunctionReturnType<typeof api.agents.listThreadsWithMetadata>
type ProjectsPage = FunctionReturnType<typeof api.projects.listProjects>

type CreateChatThreadArgs = {
  title?: string
  projectId?: string
  clientThreadKey?: string
}

const OPTIMISTIC_THREAD_PREFIX = 'optimistic-thread-'
const SIDEBAR_PAGINATION_ARGS = {
  paginationOpts: {
    cursor: null,
    numItems: 30,
  },
} as const

function normalizeThreadTitle(title?: string) {
  const cleaned = title?.trim()
  return cleaned ? cleaned.slice(0, 60) : 'New chat'
}

function resolveProjectName(localStore: OptimisticLocalStore, projectId?: string) {
  if (!projectId) {
    return undefined
  }

  const projects = localStore.getQuery(api.projects.listProjects, SIDEBAR_PAGINATION_ARGS)
  if (!projects || !Array.isArray((projects as ProjectsPage).page)) {
    return 'Project'
  }

  return (projects as ProjectsPage).page.find((project) => project.id === projectId)?.name || 'Project'
}

export function isOptimisticThreadId(threadId?: string | null) {
  return Boolean(threadId && threadId.startsWith(OPTIMISTIC_THREAD_PREFIX))
}

export function filterPersistableThreads(threads: ThreadsWithMetadata): ThreadsWithMetadata {
  return threads.filter((thread) => !isOptimisticThreadId(thread._id))
}

export function applyOptimisticCreateThread(
  localStore: OptimisticLocalStore,
  args: CreateChatThreadArgs,
) {
  const current = localStore.getQuery(api.agents.listThreadsWithMetadata, SIDEBAR_PAGINATION_ARGS)
  if (!current || !Array.isArray((current as ThreadsPage).page)) {
    return
  }
  const currentPage = current as ThreadsPage

  const now = Date.now()
  const optimisticId = `${OPTIMISTIC_THREAD_PREFIX}${args.clientThreadKey?.trim() || now}`
  const projectName = resolveProjectName(localStore, args.projectId)

  const optimisticRow: ThreadsWithMetadata[number] = {
    _id: optimisticId,
    _creationTime: now,
    lastMessageAt: now,
    title: normalizeThreadTitle(args.title),
    metadata: null,
    project: args.projectId
      ? {
          id: args.projectId,
          name: projectName || 'Project',
        }
      : null,
  }

  localStore.setQuery(api.agents.listThreadsWithMetadata, SIDEBAR_PAGINATION_ARGS, {
    ...currentPage,
    page: [optimisticRow, ...currentPage.page],
  })
}
