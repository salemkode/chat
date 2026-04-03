import type { Id } from '../lib/convexApi'
import type {
  MobileOfflineModelCollectionRecord,
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
    capabilities: model.capabilities,
    supportsReasoning:
      typeof model.supportsReasoning === 'boolean'
        ? model.supportsReasoning
        : undefined,
    reasoningLevels: model.reasoningLevels as
      | Array<'low' | 'medium' | 'high'>
      | undefined,
    defaultReasoningLevel: model.defaultReasoningLevel as
      | 'off'
      | 'low'
      | 'medium'
      | 'high'
      | undefined,
    sortOrder: model.sortOrder,
    isFavorite: Boolean(model.isFavorite),
    isFree: Boolean(model.isFree),
    icon: model.icon,
    iconType: model.iconType,
    iconUrl: model.iconUrl,
    provider: model.provider,
  }
}

export function normalizeModelCollection(
  collection: any,
): MobileOfflineModelCollectionRecord {
  return {
    id: collection._id,
    name: collection.name,
    description: collection.description,
    sortOrder: collection.sortOrder,
    modelIds: collection.modelIds,
    modelCount: collection.modelCount,
  }
}
