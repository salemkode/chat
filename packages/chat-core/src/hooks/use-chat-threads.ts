import { useMemo } from 'react'
import { useChatCoreContext } from '../context'
import type { ThreadSummary } from '../types'
import { groupThreadsByProject } from '../sidebar'

export function useChatThreads(): {
  threads: ThreadSummary[]
  setPinned: (threadId: string, pinned: boolean) => Promise<void>
  deleteThread: (threadId: string) => Promise<void>
  isLoading: boolean
  threadsByProject: Map<string, ThreadSummary[]>
  unfiledThreads: ThreadSummary[]
} {
  const { threads, setPinned, deleteThread, isLoadingThreads } =
    useChatCoreContext()

  const { projectThreads: threadsByProject, unfiledThreads } = useMemo(
    () => groupThreadsByProject(threads),
    [threads],
  )

  return {
    threads,
    setPinned,
    deleteThread,
    isLoading: isLoadingThreads,
    threadsByProject,
    unfiledThreads,
  }
}
