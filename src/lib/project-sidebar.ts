type ThreadLike = {
  id: string
  title?: string
  projectId?: string
  projectName?: string
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
    group.sort((left, right) => right.lastMessageAt - left.lastMessageAt)
  }

  unfiledThreads.sort((left, right) => right.lastMessageAt - left.lastMessageAt)

  return {
    projectThreads,
    unfiledThreads,
  }
}
