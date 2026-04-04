import type { Id } from '../lib/convexApi'
import type {
  MobileOfflineModelRecord,
  MobileOfflineProjectRecord,
  MobileOfflineThreadRecord,
} from '../offline/types'

export function toProjectId(value?: string) {
  return value as Id<'projects'> | undefined
}

export function toModelId(value?: string) {
  return value as Id<'models'> | undefined
}

export function normalizeThread(thread: any): MobileOfflineThreadRecord {
  const project = thread.project
  return {
    id: thread._id,
    title: thread.title,
    projectId: project?.id,
    projectName: project?.name,
    pinned: thread.metadata?.sortOrder === 1,
    createdAt: thread._creationTime,
    updatedAt: thread._creationTime,
  }
}

export function normalizeProject(project: any): MobileOfflineProjectRecord {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    threadCount: project.threadCount ?? 0,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

export function normalizeModel(model: any): MobileOfflineModelRecord {
  return {
    id: model._id,
    modelId: model.modelId,
    displayName: model.displayName,
    description: model.description,
    sortOrder: model.sortOrder,
    isFavorite: Boolean(model.isFavorite),
  }
}
