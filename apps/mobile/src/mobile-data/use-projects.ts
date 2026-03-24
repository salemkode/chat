import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'
import { api, type Id } from '../lib/convexApi'
import { cacheProjects, readProjects } from '../offline/cache'
import type { MobileOfflineProjectRecord } from '../offline/types'
import { useNetworkStatus } from '../utils/network-status'
import { normalizeProject } from './normalize'
import {
  type ProjectsList,
  withOptimisticProjects,
  withOptimisticThreads,
} from './optimistic'

export function useProjects() {
  const { isOnline } = useNetworkStatus()
  const liveProjects = (useQuery(api.projects.listProjects as never) ?? []) as any[]
  const [cachedProjects, setCachedProjects] = useState<MobileOfflineProjectRecord[]>([])
  const createProjectMutation = useMutation(api.projects.createProject as never).withOptimisticUpdate(
    (localStore, args: { name: string; description?: string }) => {
      const now = Date.now()
      withOptimisticProjects(localStore, (projects) => [
        {
          id: `optimistic-project-${now}`,
          name: args.name,
          description: args.description,
          threadCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        ...projects,
      ])
    },
  )
  const updateProjectMutation = useMutation(api.projects.updateProject as never).withOptimisticUpdate(
    (
      localStore,
      args: { projectId: Id<'projects'>; name?: string; description?: string },
    ) => {
      withOptimisticProjects(localStore, (projects) =>
        projects.map((project: ProjectsList[number]) =>
          project.id === args.projectId
            ? {
                ...project,
                ...(args.name !== undefined ? { name: args.name } : {}),
                ...(args.description !== undefined
                  ? { description: args.description }
                  : {}),
                updatedAt: Date.now(),
              }
            : project,
        ),
      )
    },
  )
  const deleteProjectMutation = useMutation(api.projects.deleteProject as never).withOptimisticUpdate(
    (localStore, args: { projectId: Id<'projects'> }) => {
      withOptimisticProjects(localStore, (projects) =>
        projects.filter((project: ProjectsList[number]) => project.id !== args.projectId),
      )
    },
  )
  const assignThreadToProjectMutation = useMutation(
    api.projects.assignThreadToProject as never,
  ).withOptimisticUpdate((localStore, args: { threadId: string; projectId: Id<'projects'> }) => {
    withOptimisticThreads(localStore, (threads) =>
      threads.map((thread) =>
        thread._id === args.threadId
          ? {
              ...thread,
              project: thread.project ?? {
                id: args.projectId,
                name: 'Project',
              },
            }
          : thread,
      ),
    )
  })
  const removeThreadFromProjectMutation = useMutation(
    api.projects.removeThreadFromProject as never,
  ).withOptimisticUpdate((localStore, args: { threadId: string }) => {
    withOptimisticThreads(localStore, (threads) =>
      threads.map((thread) =>
        thread._id === args.threadId
          ? {
              ...thread,
              project: null,
            }
          : thread,
      ),
    )
  })

  useEffect(() => {
    void readProjects().then(setCachedProjects)
  }, [])

  useEffect(() => {
    if (!liveProjects.length) return
    const normalized = liveProjects.map(normalizeProject)
    setCachedProjects(normalized)
    void cacheProjects(normalized)
  }, [liveProjects])

  return {
    projects: liveProjects.length ? liveProjects.map(normalizeProject) : cachedProjects,
    createProject: useCallback(
      async (values: { name: string; description?: string }) => {
        if (!isOnline) return null
        return await createProjectMutation(values as never)
      },
      [createProjectMutation, isOnline],
    ),
    updateProject: useCallback(
      async (values: { projectId: string; name?: string; description?: string }) => {
        if (!isOnline) return
        await updateProjectMutation({
          projectId: values.projectId as Id<'projects'>,
          name: values.name,
          description: values.description,
        } as never)
      },
      [isOnline, updateProjectMutation],
    ),
    deleteProject: useCallback(
      async (projectId: string) => {
        if (!isOnline) return
        await deleteProjectMutation({ projectId: projectId as Id<'projects'> } as never)
      },
      [deleteProjectMutation, isOnline],
    ),
    assignThreadToProject: useCallback(
      async (threadId: string, projectId: string) => {
        if (!isOnline) return
        await assignThreadToProjectMutation({
          threadId,
          projectId: projectId as Id<'projects'>,
        } as never)
      },
      [assignThreadToProjectMutation, isOnline],
    ),
    removeThreadFromProject: useCallback(
      async (threadId: string) => {
        if (!isOnline) return
        await removeThreadFromProjectMutation({ threadId } as never)
      },
      [isOnline, removeThreadFromProjectMutation],
    ),
  }
}
