import { useChatCoreContext } from '../context'
import type { ProjectSummary } from '../types'

export function useChatProjects(): {
  projects: ProjectSummary[]
  createProject: (args: { name: string; description?: string }) => Promise<unknown>
  isLoading: boolean
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: (numItems?: number) => void
} {
  const {
    projects,
    createProject,
    isLoadingProjects,
    hasMoreProjects,
    isLoadingMoreProjects,
    loadMoreProjects,
  } = useChatCoreContext()
  return {
    projects,
    createProject,
    isLoading: isLoadingProjects,
    hasMore: hasMoreProjects,
    isLoadingMore: isLoadingMoreProjects,
    loadMore: loadMoreProjects,
  }
}
