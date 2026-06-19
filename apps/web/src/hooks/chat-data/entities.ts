import { useCallback, useEffect, useMemo } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import {
  buildModelBrowserQueryArgs,
  hasModelBrowserQueryFilters,
  MODEL_BROWSER_INITIAL_NUM_ITEMS,
  MODEL_BROWSER_LOAD_MORE_NUM_ITEMS,
  MODEL_BROWSER_PREFETCH_NUM_ITEMS,
  type ModelBrowserQueryOptions,
} from '@chat/core'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { resolveChatSnapshot } from '@chat/core'
import { usePaginatedQuery, useQuery } from '@/lib/convex-query-cache'
import { readModelsCache, readProjectsCache, readSettings } from '@/offline/local-cache'
import { parseConvexIdForTable } from '@chat/core/logic/convex-ids'
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

export type UseModelsOptions = ModelBrowserQueryOptions<Id<'modelCollections'>> & {
  prefetchAll?: boolean
}

export function useModels(options: UseModelsOptions = {}) {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const queryArgs = useMemo(
    () =>
      buildModelBrowserQueryArgs({
        collectionId: options.collectionId,
        favoritesOnly: options.favoritesOnly,
        searchQuery: options.searchQuery,
      }),
    [options.collectionId, options.favoritesOnly, options.searchQuery],
  )
  const hasActiveFilters = hasModelBrowserQueryFilters(options)
  const metadata = useQuery(api.admin.getModelBrowserMetadata, {})
  const paginatedModels = usePaginatedQuery(
    api.admin.listModelsForBrowser,
    queryArgs,
    { initialNumItems: MODEL_BROWSER_INITIAL_NUM_ITEMS },
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
    if (
      !hasActiveFilters &&
      cacheUserId &&
      (Array.isArray(paginatedModels.results) || Array.isArray(metadata?.collections))
    ) {
      cacheModelsToLocal(cacheUserId, {
        models: paginatedModels.results ?? [],
        collections: metadata?.collections ?? [],
      })
    }
  }, [
    cacheUserId,
    hasActiveFilters,
    metadata?.collections,
    paginatedModels.results,
  ])

  useEffect(() => {
    if (!options.prefetchAll) {
      return
    }
    if (paginatedModels.status === 'CanLoadMore') {
      void paginatedModels.loadMore(MODEL_BROWSER_PREFETCH_NUM_ITEMS)
    }
  }, [
    options.prefetchAll,
    paginatedModels.loadMore,
    paginatedModels.results?.length,
    paginatedModels.status,
  ])

  const models = useMemo(
    () => {
      if (Array.isArray(paginatedModels.results)) {
        return (paginatedModels.results as ModelRecord[]).map(normalizeModel)
      }
      if (hasActiveFilters || isOnline) {
        return []
      }
      return cachedModelPicker.models || []
    },
    [cachedModelPicker.models, hasActiveFilters, isOnline, paginatedModels.results],
  )
  const collections = useMemo(
    () => {
      if (Array.isArray(metadata?.collections)) {
        return metadata.collections.map(normalizeModelCollection)
      }
      if (isOnline) {
        return []
      }
      return cachedModelPicker.collections || []
    },
    [cachedModelPicker.collections, isOnline, metadata?.collections],
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
    loadMore: (numItems = MODEL_BROWSER_LOAD_MORE_NUM_ITEMS) => paginatedModels.loadMore(numItems),
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
      clearAuxiliaryModelId?: boolean
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
