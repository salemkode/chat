export type ThreadSummary = {
  id: string
  title?: string
  projectId?: string
  projectName?: string
  pinned: boolean
  createdAt: number
}

export function groupThreadsByProject(threads: ThreadSummary[]) {
  const projectThreads = new Map<string, ThreadSummary[]>()
  const unfiledThreads: ThreadSummary[] = []

  for (const thread of threads) {
    if (!thread.projectId) {
      unfiledThreads.push(thread)
      continue
    }
    const existing = projectThreads.get(thread.projectId) ?? []
    existing.push(thread)
    projectThreads.set(thread.projectId, existing)
  }

  for (const [projectId, grouped] of projectThreads) {
    projectThreads.set(
      projectId,
      grouped.sort((left, right) => right.createdAt - left.createdAt),
    )
  }

  unfiledThreads.sort((left, right) => right.createdAt - left.createdAt)
  return { projectThreads, unfiledThreads }
}
