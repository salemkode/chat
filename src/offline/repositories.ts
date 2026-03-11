'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useConvex, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { offlineDb } from './db'
import { useOfflineContext } from './provider'
import { clearDraft, loadDraft, saveDraft } from './session'
import {
  clearSentDraft,
  enqueueOfflineMutation,
  flushOutbox,
  hydrateThreadMessages,
  persistLiveMessages,
  pullThreadIndex,
} from './sync'
import type {
  OfflineDraftRecord,
  OfflineMessageRecord,
  OfflineModelRecord,
  OfflineSettingsRecord,
  OfflineThreadRecord,
} from './schema'

function useSortedThreads() {
  return (
    useLiveQuery(async () => {
      const threads = await offlineDb.threads.toArray()
      return threads
        .filter((thread) => !thread.deletedAt)
        .sort((left, right) => {
          if (Number(right.pinned) !== Number(left.pinned)) {
            return Number(right.pinned) - Number(left.pinned)
          }
          return right.lastMessageAt - left.lastMessageAt
        })
    }, []) || []
  )
}

export function useOfflineStatus() {
  const offline = useOfflineContext()
  return {
    isOnline: offline.isOnline,
    isOfflineReady: offline.isOfflineReady,
    isAuthenticatedOrOffline: offline.isAuthenticatedOrOffline,
    isSyncing: offline.isSyncing,
    lastSyncAt: offline.lastSyncAt,
    syncError: offline.syncError,
  }
}

export function useSyncController() {
  const offline = useOfflineContext()
  return {
    syncNow: offline.syncNow,
    hydrateThread: offline.hydrateThread,
    clearOfflineData: offline.clearOfflineData,
    isSyncing: offline.isSyncing,
    lastSyncAt: offline.lastSyncAt,
    syncError: offline.syncError,
  }
}

export function useViewer() {
  const session = useLiveQuery(() => offlineDb.session.get('current'))
  const settings = useLiveQuery(() => offlineDb.settings.get('current'))

  return useMemo(
    () => ({
      id: session?.userId,
      name: settings?.displayName || session?.name,
      email: session?.email,
      image: settings?.image || session?.image,
      settings,
    }),
    [session?.email, session?.image, session?.name, session?.userId, settings],
  )
}

export function useThreads() {
  const threads = useSortedThreads()
  const { isOnline } = useOfflineStatus()
  const { syncNow } = useSyncController()
  const convex = useConvex()

  const setPinned = useCallback(
    async (threadId: string, pinned: boolean) => {
      const now = Date.now()
      const existing = await offlineDb.threads.get(threadId)
      if (!existing) return

      await offlineDb.threads.put({
        ...existing,
        pinned,
        updatedAt: now,
        version: now,
      })

      if (isOnline) {
        await convex.mutation(api.agents.setThreadPinned, {
          threadId,
          pinned,
          clientUpdatedAt: now,
        })
        await syncNow()
        return
      }

      await enqueueOfflineMutation({
        type: 'pinThread',
        payload: { threadId, pinned },
        dedupeKey: `pin:${threadId}`,
        clientUpdatedAt: now,
        createdAt: now,
      })
    },
    [convex, isOnline, syncNow],
  )

  const deleteThread = useCallback(
    async (threadId: string) => {
      const now = Date.now()
      await offlineDb.threads.update(threadId, {
        deletedAt: now,
        updatedAt: now,
        version: now,
      })

      if (isOnline) {
        await convex.mutation(api.chat.deleteThread, {
          threadId: threadId as never,
          clientUpdatedAt: now,
        })
        await syncNow()
        return
      }

      await enqueueOfflineMutation({
        type: 'deleteThread',
        payload: { threadId },
        dedupeKey: `delete:${threadId}`,
        clientUpdatedAt: now,
        createdAt: now,
      })
    },
    [convex, isOnline, syncNow],
  )

  return {
    threads,
    setPinned,
    deleteThread,
  }
}

export function useThread(threadId?: string) {
  const thread = useLiveQuery(
    () => (threadId ? offlineDb.threads.get(threadId) : undefined),
    [threadId],
  )
  const { hydrateThread } = useSyncController()
  const { isOnline } = useOfflineStatus()

  useEffect(() => {
    if (!threadId || !isOnline) return
    void hydrateThread(threadId)
  }, [hydrateThread, isOnline, threadId])

  return thread
}

export function useMessages(threadId?: string) {
  const messages =
    useLiveQuery(async () => {
      if (!threadId) return []
      const allMessages = await offlineDb.messages
        .where('threadId')
        .equals(threadId)
        .toArray()
      return allMessages
        .filter((message) => !message.deletedAt)
        .sort((left, right) => left.createdAt - right.createdAt)
    }, [threadId]) || []
  const { hydrateThread } = useSyncController()
  const { isOnline } = useOfflineStatus()

  useEffect(() => {
    if (!threadId || !isOnline) return
    void hydrateThread(threadId)
  }, [hydrateThread, isOnline, threadId])

  return { messages }
}

export function useModels() {
  const models =
    useLiveQuery(async () => {
      const data = await offlineDb.models.toArray()
      return data.sort((left, right) => left.sortOrder - right.sortOrder)
    }, []) || []
  const { isOnline } = useOfflineStatus()
  const { syncNow } = useSyncController()
  const convex = useConvex()

  const setFavorite = useCallback(
    async (modelId: string, isFavorite: boolean) => {
      const now = Date.now()
      const model = await offlineDb.models.get(modelId)
      if (!model) return

      await offlineDb.models.put({
        ...model,
        isFavorite,
      })

      if (isOnline) {
        await convex.mutation(api.admin.setFavoriteModel, {
          modelId: modelId as never,
          isFavorite,
          clientUpdatedAt: now,
        })
        await syncNow()
        return
      }

      await enqueueOfflineMutation({
        type: 'favorite',
        payload: {
          modelId: modelId as never,
          isFavorite,
        },
        dedupeKey: `favorite:${modelId}`,
        clientUpdatedAt: now,
        createdAt: now,
      })
    },
    [convex, isOnline, syncNow],
  )

  return { models, setFavorite }
}

export function useSettings() {
  const settings = useLiveQuery(() => offlineDb.settings.get('current'))
  const { isOnline } = useOfflineStatus()
  const { syncNow } = useSyncController()
  const convex = useConvex()

  const updateSettings = useCallback(
    async (values: {
      displayName?: string
      image?: string
      bio?: string
    }) => {
      const now = Date.now()
      const nextSettings: OfflineSettingsRecord = {
        id: 'current',
        displayName: values.displayName,
        image: values.image,
        bio: values.bio,
        updatedAt: now,
      }
      await offlineDb.settings.put(nextSettings)

      if (isOnline) {
        await convex.mutation(api.users.updateSettings, {
          ...values,
          clientUpdatedAt: now,
        })
        await syncNow()
        return
      }

      await enqueueOfflineMutation({
        type: 'settings',
        payload: values,
        dedupeKey: 'settings:current',
        clientUpdatedAt: now,
        createdAt: now,
      })
    },
    [convex, isOnline, syncNow],
  )

  return { settings, updateSettings }
}

export function useDraft(threadId: string) {
  const draft = useLiveQuery(
    () => offlineDb.drafts.get(threadId),
    [threadId],
  ) as OfflineDraftRecord | undefined

  const setDraft = useCallback(
    async (value: string) => {
      await saveDraft(threadId, value)
    },
    [threadId],
  )

  const resetDraft = useCallback(async () => {
    await clearDraft(threadId)
  }, [threadId])

  return {
    draft: draft?.value ?? '',
    setDraft,
    resetDraft,
  }
}

export function useSendMessage() {
  const convex = useConvex()
  const createThread = useMutation(api.agents.createChatThread)
  const sendMessage = useMutation(api.agents.generateMessage)
  const { isOnline } = useOfflineStatus()
  const { syncNow, hydrateThread } = useSyncController()

  const send = useCallback(
    async ({
      text,
      threadId,
      modelDocId,
    }: {
      text: string
      threadId?: string
      modelDocId?: string
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
        await pullThreadIndex(convex)
      }

      await sendMessage({
        threadId: nextThreadId,
        prompt: text,
        modelId: modelDocId as never,
      })

      await clearSentDraft(nextThreadId)
      await syncNow()
      void hydrateThread(nextThreadId)

      window.setTimeout(() => {
        void hydrateThread(nextThreadId as string)
      }, 1500)

      return { threadId: nextThreadId, disabledReason: null as const }
    },
    [convex, createThread, hydrateThread, isOnline, sendMessage, syncNow],
  )

  return {
    send,
    disabledReason: isOnline ? null : ('offline' as const),
  }
}

export async function replayOutboxNow(convex: ReturnType<typeof useConvex>) {
  await flushOutbox(convex)
}

export async function seedMessagesFromLiveSource(
  threadId: string,
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    text: string
    parts: Array<Record<string, unknown>>
    status?: 'done' | 'streaming'
  }>,
) {
  await persistLiveMessages(threadId, messages)
}
