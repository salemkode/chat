import { parseConvexIdForTable } from '@chat/shared/logic/convex-ids'
import type { Id } from '../lib/convexApi'
import type {
  MobileOfflineModelRecord,
  MobileOfflineProjectRecord,
  MobileOfflineThreadRecord,
} from '../offline/types'

export function toProjectId(value?: string): Id<'projects'> | undefined {
  return parseConvexIdForTable('projects', value)
}

export function toModelId(value?: string): Id<'models'> | undefined {
  return parseConvexIdForTable('models', value)
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
    updatedAt: thread.lastMessageAt ?? thread._creationTime,
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
    capabilities: Array.isArray(model.capabilities) ? model.capabilities : undefined,
    sortOrder: model.sortOrder,
    isFavorite: Boolean(model.isFavorite),
  }
}
