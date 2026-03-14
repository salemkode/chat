import { useUIMessages } from '@convex-dev/agent/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useConvexAuth, useMutation } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { useQuery } from '@/lib/convex-query-cache'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { offlineDb } from '@/offline/db'
import type {
  OfflineModelRecord,
  OfflineThreadRecord,
} from '@/offline/schema'
import { storeTrustedSession } from '@/offline/session'

const DRAFT_PREFIX = 'chat-draft:'

type ViewerRecord = FunctionReturnType<typeof api.users.viewer>
type SettingsRecord = FunctionReturnType<typeof api.users.getSettings>
type ThreadsRecord = FunctionReturnType<typeof api.agents.listThreadsWithMetadata>
type ThreadRecord = ThreadsRecord[number]
type ModelsWithProvidersRecord = FunctionReturnType<
  typeof api.admin.listModelsWithProviders
>
type ModelRecord = ModelsWithProvidersRecord['models'][number]
type ChatMessage = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

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
  return {
    id: thread._id,
    title: thread.title,
    emoji: thread.metadata?.emoji || '💬',
    icon: thread.metadata?.icon,
    pinned: thread.metadata?.sortOrder === 1,
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
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { isOnline } = useOnlineStatus()
  const session = useLiveQuery(() => offlineDb.session.get('current'))

  return {
    isOnline,
    isLoading,
    isOfflineReady: Boolean(session?.trusted),
    isAuthenticatedOrOffline: isAuthenticated || (!isOnline && Boolean(session?.trusted)),
  }
}

export function useViewer() {
  const viewer = useQuery(api.users.viewer)
  const cachedSession = useLiveQuery(() => offlineDb.session.get('current'))
  const cachedSettings = useLiveQuery(() => offlineDb.settings.get('current'))

  useEffect(() => {
    void cacheViewer(viewer, viewer?.settings)
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
            userId: cachedSession.userId as never,
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
    return threads.sort((left, right) => {
      if (Number(right.pinned) !== Number(left.pinned)) {
        return Number(right.pinned) - Number(left.pinned)
      }
      return right.lastMessageAt - left.lastMessageAt
    })
  }, [])
  const setThreadPinned = useMutation(api.agents.setThreadPinned)
  const deleteThreadMutation = useMutation(api.chat.deleteThread)

  useEffect(() => {
    if (liveThreads.length > 0) {
      void cacheThreads(liveThreads)
    }
  }, [liveThreads])

  const threads = useMemo(
    () => (liveThreads.length > 0 ? liveThreads.map(normalizeThread) : cachedThreads || []),
    [cachedThreads, liveThreads],
  )

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
      await deleteThreadMutation({ threadId: threadId as never })
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
      return {
        id: liveThread._id,
        title: liveThread.title,
        emoji: liveThread.metadata?.emoji || '💬',
        icon: liveThread.metadata?.icon,
        pinned: liveThread.metadata?.sortOrder === 1,
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
      await setFavoriteModel({ modelId: modelId as never, isFavorite })
    },
    [isOnline, setFavoriteModel],
  )

  return { models, setFavorite }
}

export function useSettings() {
  const { isOnline } = useOnlineStatus()
  const liveSettings = useQuery(api.users.getSettings)
  const cachedSettings = useLiveQuery(() => offlineDb.settings.get('current'))
  const updateSettingsMutation = useMutation(api.users.updateSettings)

  useEffect(() => {
    void cacheSettings(liveSettings)
  }, [liveSettings])

  const settings = (liveSettings ||
    (cachedSettings
      ? {
          userId: '' as never,
          displayName: cachedSettings.displayName,
          image: cachedSettings.image,
          bio: cachedSettings.bio,
          updatedAt: cachedSettings.updatedAt,
        }
      : null)) as SettingsRecord

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
  const sendMessage = useMutation(api.agents.generateMessage)

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
      searchEnabled,
    }: {
      text: string
      threadId?: string
      modelDocId?: string
      searchEnabled?: boolean
    }) => {
      if (!isOnline) {
        return { threadId, disabledReason: 'offline' as const }
      }

      if (!modelDocId) {
        throw new Error('No model selected')
      }

      let nextThreadId = threadId
      if (!nextThreadId) {
        nextThreadId = await createThread({ title: text.substring(0, 30) })
      }
      const resolvedThreadId = nextThreadId
      if (!resolvedThreadId) {
        throw new Error('Failed to create a chat thread')
      }

      await sendMessage({
        threadId: resolvedThreadId,
        prompt: text,
        modelId: modelDocId as never,
        searchEnabled: searchEnabled ?? false,
      })

      writeDraft(threadId || 'new', '')
      writeDraft(resolvedThreadId, '')

      return { threadId: resolvedThreadId, disabledReason: null }
    },
    [createThread, isOnline, sendMessage],
  )

  return {
    send,
    disabledReason: isOnline ? null : 'offline',
  }
}
