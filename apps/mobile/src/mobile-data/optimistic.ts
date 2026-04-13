import type { OptimisticLocalStore } from 'convex/browser'
import type { FunctionReturnType } from 'convex/server'
import { api } from '../lib/convexApi'

export type ThreadsWithMetadata = FunctionReturnType<typeof api.agents.listThreadsWithMetadata>
export type ProjectsList = FunctionReturnType<typeof api.projects.listProjects>
export type ModelsWithProviders = FunctionReturnType<typeof api.admin.listModelsWithProviders>

export function withOptimisticThreads(
  localStore: OptimisticLocalStore,
  updater: (threads: ThreadsWithMetadata) => ThreadsWithMetadata,
) {
  const current = localStore.getQuery(api.agents.listThreadsWithMetadata, {})
  if (!Array.isArray(current)) return
  localStore.setQuery(api.agents.listThreadsWithMetadata, {}, updater(current))
}

export function withOptimisticProjects(
  localStore: OptimisticLocalStore,
  updater: (projects: ProjectsList) => ProjectsList,
) {
  const current = localStore.getQuery(api.projects.listProjects, {})
  if (!Array.isArray(current)) return
  localStore.setQuery(api.projects.listProjects, {}, updater(current))
}

export function withOptimisticModels(
  localStore: OptimisticLocalStore,
  updater: (current: ModelsWithProviders) => ModelsWithProviders,
) {
  const current = localStore.getQuery(api.admin.listModelsWithProviders, {})
  if (!current) return
  localStore.setQuery(api.admin.listModelsWithProviders, {}, updater(current))
}
