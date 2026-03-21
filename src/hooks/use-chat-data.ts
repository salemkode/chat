import { useAuth } from '@clerk/tanstack-react-start'
import { useUIMessages } from '@convex-dev/agent/react'
import type { UsePaginatedQueryResult } from 'convex/react'
import { useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from '../../convex/_generated/dataModel'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { api } from '../../convex/_generated/api'
import { useQuery } from '@/lib/convex-query-cache'
import {
  buildMessageProgressSignature,
  getLatestActiveAssistant,
  isGenerationStalled,
} from '@/lib/chat-generation'
import { parseUploadResponse } from '@/lib/parsers'
import { compareThreadsForSidebar } from '@/lib/project-sidebar'
import { useOnlineStatus } from '@/hooks/use-online-status'
import type {
  OfflineModelRecord,
  OfflineProjectRecord,
  OfflineThreadRecord,
} from '@/offline/schema'
import {
  getOfflineCacheVersion,
  readMessagesCache,
  readModelsCache,
  readProjectsCache,
  readSession,
  readSettings,
  readThreadsCache,
  storeTrustedSession,
  subscribeOfflineCache,
  writeMessagesCache,
  writeModelsCache,
  writeProjectsCache,
  writeSettingsForUser,
  writeThreadsCache,
} from '@/offline/local-cache'

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion -- convex-helpers cached useQuery / useUIMessages widen types vs strict ESLint */

const DRAFT_PREFIX = 'chat-draft:'

type ViewerRecord = FunctionReturnType<typeof api.users.viewer>
type SettingsRecord = FunctionReturnType<typeof api.users.getSettings>
type ThreadsRecord = FunctionReturnType<
  typeof api.agents.listThreadsWithMetadata
>
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
export type ChatMessage = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]

export type UseMessagesResult = {
  messages: ChatMessage[]
  status: UsePaginatedQueryResult<ChatMessage>['status']
  hasMore: boolean
  isLoadingMore: boolean
  loadOlderMessages: (numItems: number) => void
}

type LocalCachedMessageRow = {
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

type CachedSettingsView = {
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

function useOfflineCacheVersion() {
  return useSyncExternalStore(
    subscribeOfflineCache,
    getOfflineCacheVersion,
    () => 0,
  )
}

/** Convex user id for local cache keys (not Clerk `userId`). */
function useConvexUserIdForCache() {
  const cacheVersion = useOfflineCacheVersion()
  const viewer = useQuery(api.users.viewer)
  return useMemo(() => {
    return viewer?._id ?? readSession()?.userId ?? undefined
  }, [viewer?._id, cacheVersion])
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

function normalizeModel(model: ModelRecord): OfflineModelRecord {
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

function cacheThreadsToLocal(userId: string, threads: ThreadsRecord) {
  const normalizedThreads = threads.map(normalizeThread)
  const summaries: ThreadSummary[] = normalizedThreads.map((t) => ({
    ...t,
    serverId: undefined,
  }))
  writeThreadsCache(userId, summaries)
}

function cacheModelsToLocal(userId: string, data: ModelsWithProvidersRecord) {
  writeModelsCache(userId, data.models.map(normalizeModel))
}

function cacheProjectsToLocal(userId: string, projects: ProjectsRecord) {
  writeProjectsCache(userId, projects.map(normalizeProject))
}

function cacheSettingsToLocal(
  userId: string,
  settings: SettingsRecord | null | undefined,
) {
  if (!settings) {
    return
  }
  writeSettingsForUser(userId, {
    displayName: settings.displayName,
    image: settings.image,
    bio: settings.bio,
    reasoningEnabled: settings.reasoningEnabled,
    reasoningLevel: settings.reasoningLevel as
      | 'low'
      | 'medium'
      | 'high'
      | undefined,
    updatedAt: settings.updatedAt,
  })
}

function cacheViewerToLocal(
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

function cacheMessagesToLocal(
  userId: string,
  threadId: string,
  messages: ChatMessage[],
) {
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
    failureNote:
      typeof message.failureNote === 'string' ? message.failureNote : undefined,
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

export function useCachedSessionStatus() {
  const { isLoaded, isSignedIn } = useAuth()
  const isAuthenticated = isSignedIn ?? false
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const session = useMemo(() => readSession(), [cacheVersion])
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
  const cacheVersion = useOfflineCacheVersion()
  const cachedSession = useMemo(() => readSession(), [cacheVersion])
  const cachedSettings = useMemo(() => readSettings(), [cacheVersion])

  useEffect(() => {
    if (!viewer) {
      return
    }

    cacheViewerToLocal(viewer, viewer.settings)
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
            reasoningEnabled: cachedSettings.reasoningEnabled,
            reasoningLevel: cachedSettings.reasoningLevel,
            updatedAt: cachedSettings.updatedAt,
          }
        : null,
      createdAt: undefined,
    }
  }, [cachedSession, cachedSettings, viewer])
}

export function useThreads() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const liveThreads = useQuery(api.agents.listThreadsWithMetadata) || []
  const setThreadPinned = useMutation(api.agents.setThreadPinned)
  const deleteThreadMutation = useMutation(api.chat.deleteThread)
  const [optimisticPinnedById, setOptimisticPinnedById] = useState<
    Record<string, boolean>
  >({})

  const cachedThreads = useMemo(() => {
    if (!cacheUserId) {
      return [] as ThreadSummary[]
    }
    const fromLs = readThreadsCache<ThreadSummary[]>(cacheUserId)
    const list = Array.isArray(fromLs) ? fromLs : []
    return [...list].sort(compareThreadsForSidebar)
  }, [cacheUserId, cacheVersion])

  useEffect(() => {
    if (liveThreads.length > 0 && cacheUserId) {
      cacheThreadsToLocal(cacheUserId, liveThreads)
    }
  }, [liveThreads, cacheUserId])

  const threads = useMemo<ThreadSummary[]>(() => {
    const normalized = (
      liveThreads.length > 0 ? liveThreads : cachedThreads
    ).map((thread: ThreadRecord | ThreadSummary) => {
      if ('_id' in thread) {
        const normalizedThread = normalizeThread(thread)
        return {
          ...normalizedThread,
          serverId: thread._id,
        }
      }

      return {
        ...thread,
        updatedAt: thread.lastMessageAt,
        serverId: undefined,
      }
    })

    const optimistic = normalized.map((thread) => {
      const optimisticPinned =
        optimisticPinnedById[thread.serverId || thread.id] ??
        optimisticPinnedById[thread.id]

      if (optimisticPinned === undefined) {
        return thread
      }

      return {
        ...thread,
        pinned: optimisticPinned,
        sortOrder: optimisticPinned ? 1 : 0,
      }
    })

    return optimistic.sort(compareThreadsForSidebar)
  }, [cachedThreads, liveThreads, optimisticPinnedById])

  useEffect(() => {
    if (liveThreads.length === 0) {
      return
    }

    setOptimisticPinnedById((current) => {
      let changed = false
      const next = { ...current }

      for (const thread of liveThreads) {
        const optimisticPinned = next[thread._id]
        if (optimisticPinned === undefined) {
          continue
        }

        const serverPinned = (thread.metadata?.sortOrder ?? 0) > 0
        if (optimisticPinned === serverPinned) {
          delete next[thread._id]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [liveThreads])

  const setPinned = useCallback(
    async (threadId: string, pinned: boolean) => {
      if (!isOnline) {
        return
      }
      const previousPinned = threads.find(
        (thread) => thread.serverId === threadId || thread.id === threadId,
      )?.pinned

      setOptimisticPinnedById((current) => ({
        ...current,
        [threadId]: pinned,
      }))

      try {
        await setThreadPinned({ threadId, pinned })
      } catch (error) {
        setOptimisticPinnedById((current) => {
          const next = { ...current }
          if (previousPinned === undefined) {
            delete next[threadId]
          } else {
            next[threadId] = previousPinned
          }
          return next
        })
        throw error
      }
    },
    [isOnline, setThreadPinned, threads],
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
  const cacheUserId = useConvexUserIdForCache()
  const cacheVersion = useOfflineCacheVersion()
  const liveThread = useQuery(
    api.chat.getThread,
    threadId ? { threadId } : 'skip',
  )

  const cachedThread = useMemo(() => {
    if (!threadId || !cacheUserId) {
      return undefined
    }
    const list = readThreadsCache<ThreadSummary[]>(cacheUserId)
    if (!Array.isArray(list)) {
      return undefined
    }
    return list.find((t) => t.id === threadId)
  }, [threadId, cacheUserId, cacheVersion])

  return useMemo(() => {
    if (liveThread) {
      const project = (
        liveThread as typeof liveThread & {
          project?: { id: string; name: string } | null
        }
      ).project

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

export function useMessages(threadId?: string): UseMessagesResult {
  const cacheUserId = useConvexUserIdForCache()
  const cacheVersion = useOfflineCacheVersion()
  const [streamEnabled, setStreamEnabled] = useState(Boolean(threadId))
  const stableSignatureRef = useRef('')
  const stableSnapshotCountRef = useRef(0)
  const queryArgs = threadId ? { threadId } : 'skip'
  const {
    results,
    status,
    loadMore,
  }: UsePaginatedQueryResult<ChatMessage> = useUIMessages(
    api.chat.listMessages,
    queryArgs,
    {
      initialNumItems: 30,
      stream: streamEnabled,
    },
  )

  const cachedMessages = useMemo(() => {
    if (!threadId || !cacheUserId) {
      return [] as ChatMessage[]
    }
    const raw = readMessagesCache<LocalCachedMessageRow[]>(
      cacheUserId,
      threadId,
    )
    if (!Array.isArray(raw)) {
      return [] as ChatMessage[]
    }
    return raw
      .slice()
      .sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0))
      .map(
        (message) =>
          ({
            id: message.id,
            role: message.role,
            text: message.text,
            parts: message.parts,
            failureKind: message.failureKind,
            failureMode: message.failureMode,
            failureNote: message.failureNote,
            status:
              message.status === 'streaming'
                ? 'streaming'
                : message.status === 'failed'
                  ? 'failed'
                  : 'success',
          }) as ChatMessage,
      )
  }, [threadId, cacheUserId, cacheVersion])

  const pendingCacheWriteRef = useRef<number | null>(null)
  const lastCachedSignatureRef = useRef('')
  const hasStreamingMessages = useMemo(
    () =>
      Boolean(
        results?.some(
          (message) =>
            message.status === 'streaming' || message.status === 'pending',
        ),
      ),
    [results],
  )
  const cacheSignature = useMemo(() => {
    if (!threadId || !results || results.length === 0) {
      return ''
    }

    const lastMessage = results[results.length - 1] as {
      id?: string
      status?: string
      text?: string
    }
    return [
      threadId,
      results.length,
      lastMessage?.id || '',
      lastMessage?.status || '',
      lastMessage?.text?.length || 0,
      hasStreamingMessages ? 1 : 0,
    ].join(':')
  }, [hasStreamingMessages, results, threadId])

  useEffect(() => {
    return () => {
      if (pendingCacheWriteRef.current !== null) {
        window.clearTimeout(pendingCacheWriteRef.current)
      }
    }
  }, [])

  useEffect(() => {
    lastCachedSignatureRef.current = ''
    stableSignatureRef.current = ''
    stableSnapshotCountRef.current = 0
    setStreamEnabled(Boolean(threadId))

    if (pendingCacheWriteRef.current !== null) {
      window.clearTimeout(pendingCacheWriteRef.current)
      pendingCacheWriteRef.current = null
    }
  }, [threadId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleResume = (event: Event) => {
      const customEvent = event as CustomEvent<{ threadId?: string }>
      if (!threadId || !customEvent.detail?.threadId) {
        return
      }
      if (customEvent.detail.threadId === threadId) {
        stableSignatureRef.current = ''
        stableSnapshotCountRef.current = 0
        setStreamEnabled(true)
      }
    }
    window.addEventListener('chat-stream:resume', handleResume)
    return () => window.removeEventListener('chat-stream:resume', handleResume)
  }, [threadId])

  useEffect(() => {
    if (!threadId || !cacheSignature) {
      return
    }

    if (hasStreamingMessages) {
      stableSignatureRef.current = cacheSignature
      stableSnapshotCountRef.current = 0
      if (!streamEnabled) {
        setStreamEnabled(true)
      }
      return
    }

    if (stableSignatureRef.current === cacheSignature) {
      stableSnapshotCountRef.current += 1
      if (stableSnapshotCountRef.current >= 1 && streamEnabled) {
        setStreamEnabled(false)
      }
      return
    }

    stableSignatureRef.current = cacheSignature
    stableSnapshotCountRef.current = 0
  }, [cacheSignature, hasStreamingMessages, streamEnabled, threadId])

  useEffect(() => {
    if (
      !threadId ||
      !cacheUserId ||
      !results ||
      results.length === 0 ||
      !cacheSignature
    ) {
      return
    }

    if (cacheSignature === lastCachedSignatureRef.current) {
      return
    }

    if (pendingCacheWriteRef.current !== null) {
      window.clearTimeout(pendingCacheWriteRef.current)
    }

    const writeDelayMs = hasStreamingMessages ? 1200 : 180
    pendingCacheWriteRef.current = window.setTimeout(() => {
      const snapshot = results
      try {
        cacheMessagesToLocal(cacheUserId, threadId, snapshot)
        lastCachedSignatureRef.current = cacheSignature
      } catch {
        // Ignore caching failures; live data path remains authoritative.
      }
      pendingCacheWriteRef.current = null
    }, writeDelayMs)

    return () => {
      if (pendingCacheWriteRef.current !== null) {
        window.clearTimeout(pendingCacheWriteRef.current)
        pendingCacheWriteRef.current = null
      }
    }
  }, [cacheSignature, cacheUserId, hasStreamingMessages, results, threadId])

  return {
    messages: results && results.length > 0 ? results : cachedMessages || [],
    status,
    hasMore: status === 'CanLoadMore' || status === 'LoadingMore',
    isLoadingMore: status === 'LoadingMore',
    loadOlderMessages: loadMore,
  }
}

export function useGenerationState(messages: ChatMessage[]) {
  const activeGeneration = useMemo(
    () => getLatestActiveAssistant(messages),
    [messages],
  )
  const activeMessage = activeGeneration?.message
  const activeSignature = useMemo(
    () => (activeMessage ? buildMessageProgressSignature(activeMessage) : null),
    [activeMessage],
  )
  const [lastProgressAt, setLastProgressAt] = useState(() => Date.now())
  const [tick, setTick] = useState(() => Date.now())
  const activeMessageIdRef = useRef<string | null>(null)
  const activeSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeMessage || !activeSignature) {
      activeMessageIdRef.current = null
      activeSignatureRef.current = null
      return
    }

    if (activeMessageIdRef.current !== activeMessage.id) {
      activeMessageIdRef.current = activeMessage.id
      activeSignatureRef.current = activeSignature
      setLastProgressAt(Date.now())
      return
    }

    if (activeSignatureRef.current !== activeSignature) {
      activeSignatureRef.current = activeSignature
      setLastProgressAt(Date.now())
    }
  }, [activeMessage, activeSignature])

  useEffect(() => {
    if (!activeMessage) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTick(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeMessage])

  const isStalled = Boolean(
    activeMessage &&
      isGenerationStalled({
        lastProgressAt,
        now: tick,
      }),
  )

  return {
    activeGeneration,
    isStalled,
  }
}

export function useModels() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const data = useQuery(api.admin.listModelsWithProviders)
  const setFavoriteModel = useMutation(api.admin.setFavoriteModel)

  const cachedModels = useMemo(() => {
    if (!cacheUserId) {
      return [] as OfflineModelRecord[]
    }
    const fromLs = readModelsCache<OfflineModelRecord[]>(cacheUserId)
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
      return [] as OfflineProjectRecord[]
    }
    const fromLs = readProjectsCache<OfflineProjectRecord[]>(cacheUserId)
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

  const settings: SettingsRecord | CachedSettingsView | null =
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

  return { settings, updateSettings }
}

export function useRoleContext() {
  const roleContext = useQuery(api.admin.getRoleContext)
  return (
    roleContext ?? {
      role: 'member' as const,
      isAdminLike: false,
    }
  )
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
  const stopGenerationApi = (
    api as typeof api & {
      agents: {
        stopGeneration: unknown
      }
    }
  ).agents
  const stopGeneration = useMutation(stopGenerationApi.stopGeneration as never)

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

  const resumeMessageStreaming = useCallback((threadId?: string) => {
    if (!threadId || typeof window === 'undefined') {
      return
    }
    window.dispatchEvent(
      new CustomEvent('chat-stream:resume', {
        detail: { threadId },
      }),
    )
  }, [])

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      projectId,
      searchEnabled,
      reasoning,
      attachments,
    }: {
      text: string
      threadId?: string
      modelDocId?: Id<'models'>
      projectId?: Id<'projects'>
      searchEnabled?: boolean
      reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
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
      resumeMessageStreaming(resolvedThreadId)

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
        reasoning,
        attachments: uploadedAttachments,
      } as never)

      writeDraft(threadId || 'new', '')
      writeDraft(resolvedThreadId, '')

      return { threadId: resolvedThreadId, disabledReason: null }
    },
    [createThread, isOnline, resumeMessageStreaming, sendMessage, uploadAttachments],
  )

  return {
    send,
    stop: useCallback(
      async ({
        threadId,
        promptMessageId,
      }: {
        threadId: string
        promptMessageId?: string
      }) => {
        if (!isOnline) {
          return { disabledReason: 'offline' as const, stopped: false }
        }

        const result = (await stopGeneration({
          threadId,
          promptMessageId,
        } as never)) as { stopped?: boolean } | null
        resumeMessageStreaming(threadId)

        return {
          disabledReason: null,
          stopped: Boolean(result?.stopped),
        }
      },
      [isOnline, resumeMessageStreaming, stopGeneration],
    ),
    regenerate: useCallback(
      async ({
        threadId,
        promptMessageId,
        modelDocId,
        projectId,
        searchEnabled,
        reasoning,
      }: {
        threadId: string
        promptMessageId: string
        modelDocId?: Id<'models'>
        projectId?: Id<'projects'>
        searchEnabled?: boolean
        reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
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
          reasoning,
        } as never)
        resumeMessageStreaming(threadId)

        return { disabledReason: null }
      },
      [isOnline, regenerateMessage, resumeMessageStreaming],
    ),
    disabledReason: isOnline ? null : 'offline',
  }
}
