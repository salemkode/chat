import { useChatCoreContext } from '../context'
import type { ProjectSummary } from '../types'

export function useChatProjects(): {
  projects: ProjectSummary[]
  createProject: (args: { name: string; description?: string }) => Promise<unknown>
  isLoading: boolean
} {
  const { projects, createProject, isLoadingProjects } = useChatCoreContext()
  return { projects, createProject, isLoading: isLoadingProjects }
}
