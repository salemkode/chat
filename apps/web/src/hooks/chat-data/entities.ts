import { useCallback, useEffect, useMemo } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@chat/shared/hooks/use-online-status'
import { useQuery } from '@/lib/convex-query-cache'
import {
  readModelsCache,
  readProjectsCache,
  readSettings,
} from '@/offline/local-cache'
import {
  cacheModelsToLocal,
  cacheProjectsToLocal,
  cacheSettingsToLocal,
  type CachedSettingsView,
  normalizeModel,
  toModelDocId,
  type ProjectsRecord,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

export function useModels() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const data = useQuery(api.admin.listModelsWithProviders)
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel)

  const cachedModels = useMemo(() => {
    if (!cacheUserId) {
      return []
    }
    const fromLs = readModelsCache(cacheUserId)
    return Array.isArray(fromLs) ? fromLs : []
  }, [cacheUserId, cacheVersion])

  useEffect(() => {
    if (data?.models && cacheUserId) {
      cacheModelsToLocal(cacheUserId, data)
    }
  }, [data, cacheUserId])

  const models = useMemo(
    () => (data?.models ? data.models.map(normalizeModel) : cachedModels || []),
    [cachedModels, data?.models],
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

  return { models, setFavorite }
}

export function useProjects() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const projectsApi = (
    api as typeof api & {
      projects: {
        listProjects: unknown
        createProject: unknown
        updateProject: unknown
        deleteProject: unknown
        assignThreadToProject: unknown
        removeThreadFromProject: unknown
      }
    }
  ).projects
  const liveProjects = (useQuery(projectsApi.listProjects as never) ||
    []) as ProjectsRecord
  const cachedProjects = useMemo(() => {
    if (!cacheUserId) {
      return []
    }
    const fromLs = readProjectsCache(cacheUserId)
    return Array.isArray(fromLs) ? fromLs : []
  }, [cacheUserId, cacheVersion])
  const createProjectMutation = useMutation(projectsApi.createProject as never)
  const updateProjectMutation = useMutation(projectsApi.updateProject as never)
  const deleteProjectMutation = useMutation(projectsApi.deleteProject as never)
  const assignThreadToProjectMutation = useMutation(
    projectsApi.assignThreadToProject as never,
  )
  const removeThreadFromProjectMutation = useMutation(
    projectsApi.removeThreadFromProject as never,
  )

  useEffect(() => {
    if (liveProjects.length > 0 && cacheUserId) {
      cacheProjectsToLocal(cacheUserId, liveProjects)
    }
  }, [liveProjects, cacheUserId])

  const projects = useMemo(
    () => (liveProjects.length > 0 ? liveProjects : cachedProjects || []),
    [cachedProjects, liveProjects],
  )

  const createProject = useCallback(
    async (values: { name: string; description?: string }) => {
      if (!isOnline) {
        return null
      }
      return await createProjectMutation(values as never)
    },
    [createProjectMutation, isOnline],
  )

  const updateProject = useCallback(
    async (values: {
      projectId: Id<'projects'>
      name?: string
      description?: string
    }) => {
      if (!isOnline) {
        return
      }
      await updateProjectMutation(values as never)
    },
    [isOnline, updateProjectMutation],
  )

  const deleteProject = useCallback(
    async (projectId: Id<'projects'>) => {
      if (!isOnline) {
        return
      }
      await deleteProjectMutation({ projectId } as never)
    },
    [deleteProjectMutation, isOnline],
  )

  const assignThreadToProject = useCallback(
    async (threadId: string, projectId: Id<'projects'>) => {
      if (!isOnline) {
        return
      }
      await assignThreadToProjectMutation({ threadId, projectId } as never)
    },
    [assignThreadToProjectMutation, isOnline],
  )

  const removeThreadFromProject = useCallback(
    async (threadId: string) => {
      if (!isOnline) {
        return
      }
      await removeThreadFromProjectMutation({ threadId } as never)
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
