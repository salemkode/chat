import { useCallback, useEffect, useMemo } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { resolveChatSnapshot } from '@chat/chat-core'
import { usePaginatedQuery, useQuery } from '@/lib/convex-query-cache'
import { readModelsCache, readProjectsCache, readSettings } from '@/offline/local-cache'
import { parseConvexIdForTable } from '@chat/shared/logic/convex-ids'
import {
  cacheModelsToLocal,
  cacheProjectsToLocal,
  cacheSettingsToLocal,
  type CachedSettingsView,
  normalizeModelCollection,
  normalizeModel,
  type OfflineModelPickerCacheRecord,
  toModelDocId,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

type ModelRecord = FunctionReturnType<typeof api.admin.listModelsForBrowser>['page'][number]

export function useModels() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const metadata = useQuery(api.admin.getModelBrowserMetadata, {})
  const paginatedModels = usePaginatedQuery(
    api.admin.listModelsForBrowser,
    {},
    { initialNumItems: 40 },
  )
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel)

  const cachedModelPicker = useMemo(() => {
    if (!cacheUserId) {
      return { models: [], collections: [] }
    }
    const fromLs = readModelsCache<OfflineModelPickerCacheRecord>(cacheUserId)
    if (!fromLs) {
      return { models: [], collections: [] }
    }
    if (Array.isArray(fromLs)) {
      return { models: fromLs, collections: [] }
    }
    return {
      models: Array.isArray(fromLs.models) ? fromLs.models : [],
      collections: Array.isArray(fromLs.collections) ? fromLs.collections : [],
    }
  }, [cacheUserId, cacheVersion])

  useEffect(() => {
    if (cacheUserId && (Array.isArray(paginatedModels.results) || Array.isArray(metadata?.collections))) {
      cacheModelsToLocal(cacheUserId, {
        models: paginatedModels.results ?? [],
        collections: metadata?.collections ?? [],
      })
    }
  }, [cacheUserId, metadata?.collections, paginatedModels.results])

  const models = useMemo(
    () =>
      Array.isArray(paginatedModels.results)
        ? (paginatedModels.results as ModelRecord[]).map(normalizeModel)
        : cachedModelPicker.models || [],
    [cachedModelPicker.models, paginatedModels.results],
  )
  const collections = useMemo(
    () =>
      Array.isArray(metadata?.collections)
        ? metadata.collections.map(normalizeModelCollection)
        : cachedModelPicker.collections || [],
    [cachedModelPicker.collections, metadata?.collections],
  )

  const setFavorite = useCallback(
    async (modelId: string, isFavorite: boolean) => {
      if (!isOnline) {
        return
      }
      await setFavoriteModel({ modelId: toModelDocId(modelId), isFavorite })
    },
    [isOnline, setFavoriteModel],
  )

  return {
    models,
    collections,
    setFavorite,
    autoModelAvailable: metadata?.autoModelAvailable ?? false,
    hasMore: paginatedModels.status === 'CanLoadMore' || paginatedModels.status === 'LoadingMore',
    isLoadingMore: paginatedModels.status === 'LoadingMore',
    loadMore: (numItems = 40) => paginatedModels.loadMore(numItems),
  }
}

export function useProjects() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const liveProjectsQuery = usePaginatedQuery(api.projects.listProjects, {}, { initialNumItems: 30 })
  const cachedProjects = useMemo(() => {
    if (!cacheUserId) {
      return []
    }
    const fromLs = readProjectsCache(cacheUserId)
    return Array.isArray(fromLs) ? fromLs : []
  }, [cacheUserId, cacheVersion])
  const createProjectMutation = useMutation(api.projects.createProject)
  const updateProjectMutation = useMutation(api.projects.updateProject)
  const deleteProjectMutation = useMutation(api.projects.deleteProject)
  const assignThreadToProjectMutation = useMutation(api.projects.assignThreadToProject)
  const removeThreadFromProjectMutation = useMutation(api.projects.removeThreadFromProject)

  useEffect(() => {
    if (liveProjectsQuery.results && liveProjectsQuery.results.length > 0 && cacheUserId) {
      cacheProjectsToLocal(cacheUserId, liveProjectsQuery.results)
    }
  }, [liveProjectsQuery.results, cacheUserId])

  const projects = useMemo(
    () =>
      resolveChatSnapshot({
        live: liveProjectsQuery.results,
        persisted: cachedProjects,
      }),
    [cachedProjects, liveProjectsQuery.results],
  )

  const createProject = useCallback(
    async (values: { name: string; description?: string }) => {
      if (!isOnline) {
        return null
      }
      return await createProjectMutation(values)
    },
    [createProjectMutation, isOnline],
  )

  const updateProject = useCallback(
    async (values: { projectId: Id<'projects'>; name?: string; description?: string }) => {
      if (!isOnline) {
        return
      }
      await updateProjectMutation(values)
    },
    [isOnline, updateProjectMutation],
  )

  const deleteProject = useCallback(
    async (projectId: Id<'projects'>) => {
      if (!isOnline) {
        return
      }
      await deleteProjectMutation({ projectId })
    },
    [deleteProjectMutation, isOnline],
  )

  const assignThreadToProject = useCallback(
    async (threadId: string, projectId: Id<'projects'>) => {
      if (!isOnline) {
        return
      }
      await assignThreadToProjectMutation({ threadId, projectId })
    },
    [assignThreadToProjectMutation, isOnline],
  )

  const removeThreadFromProject = useCallback(
    async (threadId: string) => {
      if (!isOnline) {
        return
      }
      await removeThreadFromProjectMutation({ threadId })
    },
    [isOnline, removeThreadFromProjectMutation],
  )

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    assignThreadToProject,
    removeThreadFromProject,
    hasMore: liveProjectsQuery.status === 'CanLoadMore' || liveProjectsQuery.status === 'LoadingMore',
    isLoading: liveProjectsQuery.results === undefined,
    isLoadingMore: liveProjectsQuery.status === 'LoadingMore',
    loadMore: (numItems = 30) => liveProjectsQuery.loadMore(numItems),
  }
}

export function useSettings() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const liveSettings = useQuery(api.users.getSettings)
  const updateSettingsMutation = useMutation(api.users.updateSettings)

  const cachedSettings = useMemo(() => readSettings(), [cacheVersion])

  useEffect(() => {
    if (liveSettings && cacheUserId) {
      cacheSettingsToLocal(cacheUserId, liveSettings)
    }
  }, [liveSettings, cacheUserId])

  const settings =
    liveSettings ??
    (cachedSettings
      ? {
          displayName: cachedSettings.displayName,
          image: cachedSettings.image,
          bio: cachedSettings.bio,
          reasoningEnabled: cachedSettings.reasoningEnabled,
          reasoningLevel: cachedSettings.reasoningLevel,
          routingPreference: cachedSettings.routingPreference,
          auxiliaryModelId: parseConvexIdForTable('models', cachedSettings.auxiliaryModelId),
          updatedAt: cachedSettings.updatedAt,
        }
      : null)

  const updateSettings = useCallback(
    async (values: {
      displayName?: string
      image?: string
      bio?: string
      reasoningEnabled?: boolean
      reasoningLevel?: 'low' | 'medium' | 'high'
      routingPreference?: 'balanced' | 'cost' | 'speed' | 'quality'
      auxiliaryModelId?: Id<'models'>
    }) => {
      if (!isOnline) {
        return
      }
      await updateSettingsMutation(values)
    },
    [isOnline, updateSettingsMutation],
  )

  return {
    settings: settings as
      | ReturnType<typeof useQuery<typeof api.users.getSettings>>
      | CachedSettingsView
      | null,
    updateSettings,
  }
}
