import {
  compareThreadsForSidebar,
  groupThreadsByProject,
  type SidebarThreadLike as ThreadLike,
} from '@chat/shared/logic/sidebar-threads'

type ProjectLike = {
  id: string
  name: string
  description?: string
}

export function filterProjectsBySearch<T extends ProjectLike>(projects: T[], searchQuery: string) {
  const needle = searchQuery.trim().toLowerCase()
  if (!needle) {
    return projects
  }

  return projects.filter((project) =>
    `${project.name}\n${project.description ?? ''}`.toLowerCase().includes(needle),
  )
}

export function filterThreadsBySearch<T extends ThreadLike>(threads: T[], searchQuery: string) {
  const needle = searchQuery.trim().toLowerCase()
  if (!needle) {
    return threads
  }

  return threads.filter((thread) =>
    `${thread.title ?? ''}\n${thread.projectName ?? ''}`.toLowerCase().includes(needle),
  )
}

export { compareThreadsForSidebar, groupThreadsByProject }
