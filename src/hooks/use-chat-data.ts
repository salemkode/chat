import { useAuth } from '@clerk/clerk-react'
import { useUIMessages } from '@convex-dev/agent/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from '../../convex/_generated/dataModel'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { useQuery } from '@/lib/convex-query-cache'
import { parseUploadResponse } from '@/lib/parsers'
import { compareThreadsForSidebar } from '@/lib/project-sidebar'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { offlineDb } from '@/offline/db'
import type {
  OfflineModelRecord,
  OfflineProjectRecord,
  OfflineThreadRecord,
} from '@/offline/schema'
import { storeTrustedSession } from '@/offline/session'

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
type ModelsWithProvidersRecord = FunctionReturnType<
  typeof api.admin.listModelsWithProviders
>
type ModelRecord = ModelsWithProvidersRecord['models'][number]
type ProjectRecord = {
  id: string
  name: string
  description?: string
  threadCount: number
  createdAt: number
  updatedAt: number
}
type ProjectsRecord = ProjectRecord[]
type ChatMessage = FunctionReturnType<typeof api.chat.listMessages>['page'][number]
type CachedSettingsView = {
  displayName?: string
  image?: string
  bio?: string
  updatedAt: number
}

export interface ThreadSummary {
  id: string
  serverId?: string
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

function getDraftStorageKey(threadId: string) {
  return `${DRAFT_PREFIX}${threadId}`
}

function readDraft(threadId: string) {
  if (typeof window === 'undefined') {
    return ''
  }
  return localStorage.getItem(getDraftStorageKey(threadId)) || ''
}

function writeDraft(threadId: string, value: string) {
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

function normalizeThread(thread: ThreadRecord): OfflineThreadRecord {
  const project = (thread as ThreadWithProject).project

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
    updatedAt: thread._creationTime,
    lastMessageAt: thread._creationTime,
    version: thread._creationTime,
  }
}

function normalizeModel(model: ModelRecord): OfflineModelRecord {
  return {
    id: model._id,
    modelId: model.modelId,
    displayName: model.displayName,
    description: model.description,
    sortOrder: model.sortOrder,
    isFavorite: model.isFavorite,
    isFree: model.isFree,
    icon: model.icon,
    iconType: model.iconType,
    iconUrl: model.iconUrl,
    provider: model.provider,
  }
}

function normalizeProject(project: ProjectRecord): OfflineProjectRecord {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    threadCount: project.threadCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

function toModelDocId(modelId: string): Id<'models'> {
  return modelId as Id<'models'>
}

async function cacheThreads(threads: ThreadsRecord) {
  const normalizedThreads = threads.map(normalizeThread)

  await offlineDb.transaction('rw', offlineDb.threads, async () => {
    await offlineDb.threads.clear()
    for (const thread of normalizedThreads) {
      await offlineDb.threads.put(thread)
    }
  })
}

async function cacheModels(data: ModelsWithProvidersRecord | undefined) {
  if (!data) {
    return
  }

  await offlineDb.transaction('rw', offlineDb.models, async () => {
    await offlineDb.models.clear()
    for (const model of data.models.map(normalizeModel)) {
      await offlineDb.models.put(model)
    }
  })
}

async function cacheProjects(projects: ProjectsRecord | undefined) {
  if (!projects) {
    return
  }

  await offlineDb.transaction('rw', offlineDb.projects, async () => {
    await offlineDb.projects.clear()
    for (const project of projects.map(normalizeProject)) {
      await offlineDb.projects.put(project)
    }
  })
}

async function cacheSettings(settings: SettingsRecord | null | undefined) {
  if (!settings) {
    return
  }

  await offlineDb.settings.put({
    id: 'current',
    displayName: settings.displayName,
    image: settings.image,
    bio: settings.bio,
    updatedAt: settings.updatedAt,
  })
}

async function cacheViewer(viewer: ViewerRecord, settings: SettingsRecord | null | undefined) {
  if (!viewer) {
    return
  }

  await storeTrustedSession({
    userId: viewer._id,
    name: viewer.name,
    email: viewer.email,
    image: viewer.image,
    trusted: true,
    schemaVersion: 1,
    lastSyncedAt: Date.now(),
  })

  await cacheSettings(settings || viewer.settings)
}

async function cacheMessages(threadId: string, messages: ChatMessage[]) {
  await offlineDb.transaction('rw', offlineDb.messages, async () => {
    await offlineDb.messages.where('threadId').equals(threadId).delete()
    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index]
      if (!message) {
        continue
      }
      const version = Date.now() + index
      await offlineDb.messages.put({
        id: message.id,
        threadId,
        role: message.role,
        text: message.text,
        parts: message.parts as Array<Record<string, unknown>>,
        createdAt: message.order ?? index,
        updatedAt: version,
        version,
        status:
          message.status === 'streaming' || message.status === 'pending'
            ? 'streaming'
            : message.status === 'failed'
              ? 'failed'
              : 'success',
      })
    }
  })
}

export function useCachedSessionStatus() {
  const { isLoaded, isSignedIn } = useAuth()
  const isAuthenticated = isSignedIn ?? false
  const { isOnline } = useOnlineStatus()
  const session = useLiveQuery(() => offlineDb.session.get('current'), [], null)
  const isOfflineSessionLoaded = session !== null
  const hasTrustedOfflineSession = Boolean(session?.trusted)
  const isLoading = !isLoaded || (!isOnline && !isOfflineSessionLoaded)

  return {
    isOnline,
    isLoading,
    isOfflineReady: hasTrustedOfflineSession,
    isAuthenticatedOrOffline:
      isAuthenticated || (!isOnline && hasTrustedOfflineSession),
  }
}

export function useViewer() {
  const viewer = useQuery(api.users.viewer)
  const cachedSession = useLiveQuery(() => offlineDb.session.get('current'))
  const cachedSettings = useLiveQuery(() => offlineDb.settings.get('current'))

  useEffect(() => {
    if (!viewer) {
      return
    }

    void cacheViewer(viewer, viewer.settings)
  }, [viewer])

  return useMemo(() => {
    if (viewer) {
      return {
        id: viewer._id,
        name: viewer.settings?.displayName || viewer.name,
        email: viewer.email,
        image: viewer.settings?.image || viewer.image,
        settings: viewer.settings,
        createdAt: viewer._creationTime,
      }
    }

    if (!cachedSession) {
      return null
    }

    return {
      id: cachedSession.userId,
      name: cachedSettings?.displayName || cachedSession.name,
      email: cachedSession.email,
      image: cachedSettings?.image || cachedSession.image,
      settings: cachedSettings
        ? {
            displayName: cachedSettings.displayName,
            image: cachedSettings.image,
            bio: cachedSettings.bio,
            updatedAt: cachedSettings.updatedAt,
          }
        : null,
      createdAt: undefined,
    }
  }, [cachedSession, cachedSettings, viewer])
}

export function useThreads() {
  const { isOnline } = useOnlineStatus()
  const liveThreads = useQuery(api.agents.listThreadsWithMetadata) || []
  const cachedThreads = useLiveQuery(async () => {
    const threads = await offlineDb.threads.toArray()
    return threads.sort(compareThreadsForSidebar)
  }, [])
  const setThreadPinned = useMutation(api.agents.setThreadPinned)
  const deleteThreadMutation = useMutation(api.chat.deleteThread)

  useEffect(() => {
    if (liveThreads.length > 0) {
      void cacheThreads(liveThreads)
    }
  }, [liveThreads])

  const threads = useMemo<ThreadSummary[]>(() => {
    if (liveThreads.length > 0) {
      return liveThreads.map((thread: ThreadRecord) => {
        const normalized = normalizeThread(thread)
        return {
          ...normalized,
          serverId: thread._id,
        }
      })
    }

    return (cachedThreads || []).map((thread) => ({
      ...thread,
      serverId: undefined,
    }))
  }, [cachedThreads, liveThreads])

  const setPinned = useCallback(
    async (threadId: string, pinned: boolean) => {
      if (!isOnline) {
        return
      }
      await setThreadPinned({ threadId, pinned })
    },
    [isOnline, setThreadPinned],
  )

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!isOnline) {
        return
      }
      await deleteThreadMutation({ threadId })
    },
    [deleteThreadMutation, isOnline],
  )

  return { threads, setPinned, deleteThread }
}

export function useThread(threadId?: string) {
  const liveThread = useQuery(api.chat.getThread, threadId ? { threadId } : 'skip')
  const cachedThread = useLiveQuery(
    () => (threadId ? offlineDb.threads.get(threadId) : undefined),
    [threadId],
  )

  return useMemo(() => {
    if (liveThread) {
      const project = (liveThread as typeof liveThread & {
        project?: { id: string; name: string } | null
      }).project

      return {
        id: liveThread._id,
        title: liveThread.title,
        emoji: liveThread.metadata?.emoji || '💬',
        icon: liveThread.metadata?.icon,
        projectId: project?.id,
        projectName: project?.name,
        sortOrder: liveThread.metadata?.sortOrder ?? 0,
        pinned: (liveThread.metadata?.sortOrder ?? 0) > 0,
        createdAt: liveThread._creationTime,
      }
    }

    if (!cachedThread) {
      return null
    }

    return cachedThread
  }, [cachedThread, liveThread])
}

export function useMessages(threadId?: string) {
  const queryArgs = threadId ? { threadId } : 'skip'
  const { results, status } = useUIMessages(api.chat.listMessages, queryArgs, {
    initialNumItems: 30,
    stream: true,
  })
  const cachedMessages = useLiveQuery(
    async () => {
      if (!threadId) {
        return []
      }

      const messages = await offlineDb.messages
        .where('threadId')
        .equals(threadId)
        .toArray()

      return messages
        .sort((left, right) => left.createdAt - right.createdAt)
        .map(
          (message) =>
            ({
              id: message.id,
              role: message.role,
              text: message.text,
              parts: message.parts,
              status:
                message.status === 'streaming'
                  ? 'streaming'
                  : message.status === 'failed'
                    ? 'failed'
                    : 'success',
            }) as ChatMessage,
        )
    },
    [threadId],
  )

  useEffect(() => {
    if (threadId && results && results.length > 0) {
      void cacheMessages(threadId, results)
    }
  }, [results, threadId])

  return {
    messages: results && results.length > 0 ? results : cachedMessages || [],
    status,
  }
}

export function useModels() {
  const { isOnline } = useOnlineStatus()
  const data = useQuery(api.admin.listModelsWithProviders)
  const cachedModels = useLiveQuery(
    () => offlineDb.models.orderBy('sortOrder').toArray(),
    [],
  )
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel)

  useEffect(() => {
    void cacheModels(data)
  }, [data])

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
  const { isOnline } = useOnlineStatus()
  const projectsApi = (api as typeof api & {
    projects: {
      listProjects: unknown
      createProject: unknown
      updateProject: unknown
      deleteProject: unknown
      assignThreadToProject: unknown
      removeThreadFromProject: unknown
    }
  }).projects
  const liveProjects = (useQuery(projectsApi.listProjects as never) ||
    []) as ProjectsRecord
  const cachedProjects = useLiveQuery(
    () => offlineDb.projects.orderBy('updatedAt').reverse().toArray(),
    [],
  )
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
    void cacheProjects(liveProjects)
  }, [liveProjects])

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
  const { isOnline } = useOnlineStatus()
  const liveSettings = useQuery(api.users.getSettings)
  const cachedSettings = useLiveQuery(() => offlineDb.settings.get('current'))
  const updateSettingsMutation = useMutation(api.users.updateSettings)

  useEffect(() => {
    void cacheSettings(liveSettings)
  }, [liveSettings])

  const settings: SettingsRecord | CachedSettingsView | null =
    liveSettings ??
    (cachedSettings
      ? {
          displayName: cachedSettings.displayName,
          image: cachedSettings.image,
          bio: cachedSettings.bio,
          updatedAt: cachedSettings.updatedAt,
        }
      : null)

  const updateSettings = useCallback(
    async (values: {
      displayName?: string
      image?: string
      bio?: string
    }) => {
      if (!isOnline) {
        return
      }
      await updateSettingsMutation(values)
    },
    [isOnline, updateSettingsMutation],
  )

  return { settings, updateSettings }
}

export function useDraft(threadId: string) {
  const [draft, setDraftState] = useState(() => readDraft(threadId))

  useEffect(() => {
    setDraftState(readDraft(threadId))
  }, [threadId])

  const setDraft = useCallback(
    async (value: string) => {
      setDraftState(value)
      writeDraft(threadId, value)
    },
    [threadId],
  )

  const resetDraft = useCallback(async () => {
    setDraftState('')
    writeDraft(threadId, '')
  }, [threadId])

  return { draft, setDraft, resetDraft }
}

export function useSendMessage() {
  const { isOnline } = useOnlineStatus()
  const createThread = useMutation(api.agents.createChatThread)
  const generateAttachmentUploadUrl = useMutation(
    api.agents.generateAttachmentUploadUrl,
  )
  const sendMessage = useMutation(api.agents.generateMessage)
  const regenerateMessage = useMutation(api.agents.regenerateMessage)

  const uploadAttachments = useCallback(
    async (files: File[]) => {
      return await Promise.all(
        files.map(async (file) => {
          const uploadUrl = await generateAttachmentUploadUrl({})
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': file.type,
            },
            body: file,
          })

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`)
          }

          const payload = parseUploadResponse(await response.json())

          return {
            storageId: payload.storageId as Id<'_storage'>,
            filename: file.name,
            mediaType: file.type,
          }
        }),
      )
    },
    [generateAttachmentUploadUrl],
  )

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      projectId,
      searchEnabled,
      attachments,
    }: {
      text: string
      threadId?: string
      modelDocId?: Id<'models'>
      projectId?: Id<'projects'>
      searchEnabled?: boolean
      attachments?: File[]
    }) => {
      if (!isOnline) {
        return { threadId, disabledReason: 'offline' as const }
      }

      if (!modelDocId) {
        throw new Error('No model selected')
      }

      let nextThreadId = threadId
      if (!nextThreadId) {
        nextThreadId = await createThread({
          title: text.substring(0, 30) || attachments?.[0]?.name || 'New chat',
          projectId,
        } as never)
      }
      const resolvedThreadId = nextThreadId
      if (!resolvedThreadId) {
        throw new Error('Failed to create a chat thread')
      }

      const uploadedAttachments =
        attachments && attachments.length > 0
          ? await uploadAttachments(attachments)
          : undefined

      await sendMessage({
        threadId: resolvedThreadId,
        prompt: text,
        modelId: modelDocId,
        projectId,
        searchEnabled: searchEnabled ?? false,
        attachments: uploadedAttachments,
      } as never)

      writeDraft(threadId || 'new', '')
      writeDraft(resolvedThreadId, '')

      return { threadId: resolvedThreadId, disabledReason: null }
    },
    [createThread, isOnline, sendMessage, uploadAttachments],
  )

  return {
    send,
    regenerate: useCallback(
      async ({
        threadId,
        promptMessageId,
        modelDocId,
        projectId,
        searchEnabled,
      }: {
        threadId: string
        promptMessageId: string
        modelDocId?: Id<'models'>
        projectId?: Id<'projects'>
        searchEnabled?: boolean
      }) => {
        if (!isOnline) {
          return { disabledReason: 'offline' as const }
        }

        if (!modelDocId) {
          throw new Error('No model selected')
        }

        await regenerateMessage({
          threadId,
          promptMessageId,
          modelId: modelDocId,
          projectId,
          searchEnabled: searchEnabled ?? false,
        } as never)

        return { disabledReason: null }
      },
      [isOnline, regenerateMessage],
    ),
    disabledReason: isOnline ? null : 'offline',
  }
}
