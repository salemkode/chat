type ThreadLike = {
  id: string
  title?: string
  projectId?: string
  projectName?: string
  sortOrder?: number
  pinned?: boolean
  lastMessageAt: number
}

type ProjectLike = {
  id: string
  name: string
  description?: string
}

export function filterProjectsBySearch<T extends ProjectLike>(
  projects: T[],
  searchQuery: string,
) {
  const needle = searchQuery.trim().toLowerCase()
  if (!needle) {
    return projects
  }

  return projects.filter((project) =>
    `${project.name}\n${project.description ?? ''}`.toLowerCase().includes(needle),
  )
}

export function filterThreadsBySearch<T extends ThreadLike>(
  threads: T[],
  searchQuery: string,
) {
  const needle = searchQuery.trim().toLowerCase()
  if (!needle) {
    return threads
  }

  return threads.filter((thread) =>
    `${thread.title ?? ''}\n${thread.projectName ?? ''}`
      .toLowerCase()
      .includes(needle),
  )
}

function getThreadSortOrder(thread: ThreadLike) {
  if (thread.sortOrder !== undefined) {
    return thread.sortOrder
  }

  return Number(thread.pinned)
}

export function compareThreadsForSidebar<T extends ThreadLike>(left: T, right: T) {
  const leftSortOrder = getThreadSortOrder(left)
  const rightSortOrder = getThreadSortOrder(right)

  if (rightSortOrder !== leftSortOrder) {
    return rightSortOrder - leftSortOrder
  }

  return right.lastMessageAt - left.lastMessageAt
}

export function groupThreadsByProject<T extends ThreadLike>(threads: T[]) {
  const projectThreads = new Map<string, T[]>()
  const unfiledThreads: T[] = []

  for (const thread of threads) {
    if (!thread.projectId) {
      unfiledThreads.push(thread)
      continue
    }

    const current = projectThreads.get(thread.projectId) ?? []
    current.push(thread)
    projectThreads.set(thread.projectId, current)
  }

  for (const group of projectThreads.values()) {
    group.sort(compareThreadsForSidebar)
  }

  unfiledThreads.sort(compareThreadsForSidebar)

  return {
    projectThreads,
    unfiledThreads,
  }
}
