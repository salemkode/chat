import { useQuery } from '@/lib/convex-query-cache'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { useMemo, useSyncExternalStore } from 'react'
import type {
  OfflineModelCollectionRecord,
  OfflineModelPickerCacheRecord,
  OfflineModelRecord,
  OfflineProjectRecord,
  OfflineThreadRecord,
} from '@/offline/schema'
import {
  getOfflineCacheVersion,
  readSession,
  storeTrustedSession,
  subscribeOfflineCache,
  writeMessagesCache,
  writeModelsCache,
  writeProjectsCache,
  writeSettingsForUser,
  writeThreadsCache,
} from '@/offline/local-cache'

export type { OfflineModelPickerCacheRecord } from '@/offline/schema'

const DRAFT_PREFIX = 'chat-draft:'

type ViewerRecord = FunctionReturnType<typeof api.users.viewer>
type SettingsRecord = FunctionReturnType<typeof api.users.getSettings>
type ThreadsRecord = FunctionReturnType<typeof api.agents.listThreadsWithMetadata>
type ThreadRecord = ThreadsRecord[number]
type ThreadWithProject = ThreadRecord & {
  project?: {
    id: string
    name: string
    description?: string
  } | null
}
type ModelsWithProvidersRecord = FunctionReturnType<typeof api.admin.listModelsWithProviders> & {
  collections?: Array<{
    _id: string
    name: string
    description?: string
    sortOrder: number
    modelIds: string[]
    modelCount: number
  }>
}
type ModelRecord = ModelsWithProvidersRecord['models'][number]
type ModelCollectionRecord = NonNullable<ModelsWithProvidersRecord['collections']>[number]
type ProjectRecord = {
  id: string
  name: string
  description?: string
  threadCount: number
  createdAt: number
  updatedAt: number
}
export type ProjectsRecord = ProjectRecord[]

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  parts: Array<Record<string, unknown>>
  status: 'success' | 'streaming' | 'pending' | 'failed'
  order?: number
  stepOrder?: number
  createdAt?: number
  failureKind?: 'stopped' | 'error'
  failureMode?: 'replace' | 'clarify'
  failureNote?: string
  localOnly?: boolean
  clientSendId?: string
}

export type LocalCachedMessageRow = {
  id: string
  role: 'user' | 'assistant'
  text: string
  parts: Array<Record<string, unknown>>
  createdAt?: number
  failureKind?: 'stopped' | 'error'
  failureMode?: 'replace' | 'clarify'
  failureNote?: string
  status?: 'success' | 'streaming' | 'failed'
}

export type CachedSettingsView = {
  displayName?: string
  image?: string
  bio?: string
  reasoningEnabled?: boolean
  reasoningLevel?: 'low' | 'medium' | 'high'
  updatedAt: number
}

export interface ThreadSummary {
  id: string
  serverId?: string
  isOptimistic?: boolean
  title?: string
  emoji: string
  icon?: string
  projectId?: string
  projectName?: string
  sortOrder: number
  pinned: boolean
  createdAt: number
  updatedAt: number
  lastMessageAt: number
}

export function useOfflineCacheVersion() {
  return useSyncExternalStore(subscribeOfflineCache, getOfflineCacheVersion, () => 0)
}

export function useConvexUserIdForCache() {
  const cacheVersion = useOfflineCacheVersion()
  const viewer = useQuery(api.users.viewer)
  return useMemo(() => {
    return viewer?._id ?? readSession()?.userId ?? undefined
  }, [viewer?._id, cacheVersion])
}

function getDraftStorageKey(threadId: string) {
  return `${DRAFT_PREFIX}${threadId}`
}

export function readDraft(threadId: string) {
  if (typeof window === 'undefined') {
    return ''
  }
  return localStorage.getItem(getDraftStorageKey(threadId)) || ''
}

export function writeDraft(threadId: string, value: string) {
  if (typeof window === 'undefined') {
    return
  }

  const key = getDraftStorageKey(threadId)
  if (value) {
    localStorage.setItem(key, value)
    return
  }

  localStorage.removeItem(key)
}

export function normalizeThread(thread: ThreadRecord): OfflineThreadRecord {
  const project = (thread as ThreadWithProject).project
  const lastMessageAt =
    (
      thread as ThreadRecord & {
        lastMessageAt?: number
      }
    ).lastMessageAt ?? thread._creationTime

  return {
    id: thread._id,
    title: thread.title,
    emoji: thread.metadata?.emoji || '💬',
    icon: thread.metadata?.icon,
    projectId: project?.id,
    projectName: project?.name,
    sortOrder: thread.metadata?.sortOrder ?? 0,
    pinned: (thread.metadata?.sortOrder ?? 0) > 0,
    createdAt: thread._creationTime,
    updatedAt: lastMessageAt,
    lastMessageAt,
    version: thread._creationTime,
  }
}

export function normalizeModel(model: ModelRecord): OfflineModelRecord {
  return {
    id: model._id,
    modelId: model.modelId,
    displayName: model.displayName,
    description: model.description,
    capabilities: model.capabilities,
    supportedAttachmentMediaTypes: model.supportedAttachmentMediaTypes,
    attachmentValidationStatus: model.attachmentValidationStatus,
    supportsReasoning:
      typeof model.supportsReasoning === 'boolean' ? model.supportsReasoning : undefined,
    reasoningLevels: model.reasoningLevels as Array<'low' | 'medium' | 'high'> | undefined,
    defaultReasoningLevel: model.defaultReasoningLevel as
      | 'off'
      | 'low'
      | 'medium'
      | 'high'
      | undefined,
    sortOrder: model.sortOrder,
    isFavorite: model.isFavorite,
    isFree: model.isFree,
    icon: model.icon,
    iconType: model.iconType,
    iconUrl: model.iconUrl,
    provider: model.provider,
  }
}

export function normalizeModelCollection(
  collection: ModelCollectionRecord,
): OfflineModelCollectionRecord {
  return {
    id: collection._id,
    name: collection.name,
    description: collection.description,
    sortOrder: collection.sortOrder,
    modelIds: collection.modelIds,
    modelCount: collection.modelCount,
  }
}

export function normalizeProject(project: ProjectRecord): OfflineProjectRecord {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    threadCount: project.threadCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

export function toModelDocId(modelId: string): Id<'models'> {
  return modelId as Id<'models'>
}

export function cacheThreadsToLocal(userId: string, threads: ThreadsRecord) {
  const normalizedThreads = threads.map(normalizeThread)
  const summaries: ThreadSummary[] = normalizedThreads.map((t) => ({
    ...t,
    serverId: undefined,
  }))
  writeThreadsCache(userId, summaries)
}

export function cacheModelsToLocal(userId: string, data: ModelsWithProvidersRecord) {
  const models = Array.isArray(data.models) ? data.models : []
  const collections = Array.isArray(data.collections) ? data.collections : []
  const payload: OfflineModelPickerCacheRecord = {
    models: models.map(normalizeModel),
    collections: collections.map(normalizeModelCollection),
  }
  writeModelsCache(userId, payload)
}

export function cacheProjectsToLocal(userId: string, projects: ProjectsRecord) {
  writeProjectsCache(userId, projects.map(normalizeProject))
}

export function cacheSettingsToLocal(userId: string, settings: SettingsRecord | null | undefined) {
  if (!settings) {
    return
  }
  writeSettingsForUser(userId, {
    displayName: settings.displayName,
    image: settings.image,
    bio: settings.bio,
    reasoningEnabled: settings.reasoningEnabled,
    reasoningLevel: settings.reasoningLevel as 'low' | 'medium' | 'high' | undefined,
    updatedAt: settings.updatedAt,
  })
}

export function cacheViewerToLocal(
  viewer: ViewerRecord,
  settings: SettingsRecord | null | undefined,
) {
  if (!viewer) {
    return
  }

  storeTrustedSession({
    userId: viewer._id,
    name: viewer.name,
    email: viewer.email,
    image: viewer.image,
    trusted: true,
    schemaVersion: 1,
    lastSyncedAt: Date.now(),
  })

  cacheSettingsToLocal(viewer._id, settings || viewer.settings)
}

export function cacheMessagesToLocal(userId: string, threadId: string, messages: ChatMessage[]) {
  const versionBase = Date.now()
  const normalizedMessages = messages.map((message, index) => ({
    id: message.id,
    threadId,
    role: message.role,
    text: message.text,
    parts: message.parts as Array<Record<string, unknown>>,
    failureKind:
      message.failureKind === 'stopped' || message.failureKind === 'error'
        ? message.failureKind
        : undefined,
    failureMode:
      message.failureMode === 'replace' || message.failureMode === 'clarify'
        ? message.failureMode
        : undefined,
    failureNote: typeof message.failureNote === 'string' ? message.failureNote : undefined,
    createdAt: message.order ?? index,
    updatedAt: versionBase + index,
    version: versionBase + index,
    status:
      message.status === 'streaming' || message.status === 'pending'
        ? 'streaming'
        : message.status === 'failed'
          ? 'failed'
          : 'success',
  }))

  writeMessagesCache(userId, threadId, normalizedMessages)
}
