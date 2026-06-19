export type SidebarThreadLike = {
  id: string
  title?: string
  projectId?: string
  projectName?: string
  sortOrder?: number
  pinned?: boolean
  lastMessageAt: number
}

function getThreadSortOrder(thread: SidebarThreadLike) {
  if (thread.sortOrder !== undefined) {
    return thread.sortOrder
  }

  return thread.pinned ? 1 : 0
}

export function compareThreadsForSidebar<T extends SidebarThreadLike>(left: T, right: T) {
  const leftSortOrder = getThreadSortOrder(left)
  const rightSortOrder = getThreadSortOrder(right)

  if (rightSortOrder !== leftSortOrder) {
    return rightSortOrder - leftSortOrder
  }

  return right.lastMessageAt - left.lastMessageAt
}

function sortThreadsForSidebar<T extends SidebarThreadLike>(threads: T[]) {
  const sortedThreads: T[] = []

  for (const thread of threads) {
    const insertAt = sortedThreads.findIndex(
      (sortedThread) => compareThreadsForSidebar(thread, sortedThread) < 0,
    )

    if (insertAt === -1) {
      sortedThreads.push(thread)
      continue
    }

    sortedThreads.splice(insertAt, 0, thread)
  }

  return sortedThreads
}

export function groupThreadsByProject<T extends SidebarThreadLike>(threads: T[]) {
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

function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function getMonthGroupLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function getRelativeThreadDateGroup(timestamp: number, now = Date.now()) {
  const dayMs = 24 * 60 * 60 * 1000
  const dayDelta = Math.floor((startOfLocalDay(now) - startOfLocalDay(timestamp)) / dayMs)

  if (dayDelta <= 0) {
    return { id: 'today', label: 'Today' }
  }

  if (dayDelta === 1) {
    return { id: 'yesterday', label: 'Yesterday' }
  }

  if (dayDelta < 7) {
    return { id: 'previous-7-days', label: 'Previous 7 Days' }
  }

  if (dayDelta < 30) {
    return { id: 'previous-30-days', label: 'Previous 30 Days' }
  }

  const monthLabel = getMonthGroupLabel(timestamp)
  return {
    id: `month-${new Date(timestamp).getFullYear()}-${new Date(timestamp).getMonth() + 1}`,
    label: monthLabel,
  }
}

export function groupThreadsByRelativeDate<T extends SidebarThreadLike>(
  threads: T[],
  now = Date.now(),
) {
  const groups: Array<{ id: string; label: string; threads: T[] }> = []
  const groupsById = new Map<string, { id: string; label: string; threads: T[] }>()

  for (const thread of sortThreadsForSidebar(threads)) {
    const groupKey = getRelativeThreadDateGroup(thread.lastMessageAt, now)
    const existingGroup = groupsById.get(groupKey.id)

    if (existingGroup) {
      existingGroup.threads.push(thread)
      continue
    }

    const group = {
      ...groupKey,
      threads: [thread],
    }
    groups.push(group)
    groupsById.set(group.id, group)
  }

  return groups
}
