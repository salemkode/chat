import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useQuery } from '@/lib/convex-query-cache'
import { compareThreadsForSidebar } from '@/lib/project-sidebar'
import { readThreadsCache } from '@/offline/local-cache'
import {
  filterPersistableThreads,
  isOptimisticThreadId,
} from '@/hooks/chat-data/optimistic-threads'
import {
  cacheThreadsToLocal,
  normalizeThread,
  type ThreadSummary,
  useConvexUserIdForCache,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

export function useThreads() {
  const cacheUserId = useConvexUserIdForCache()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const liveThreads = useQuery(api.agents.listThreadsWithMetadata)
  const setThreadPinned = useMutation(api.agents.setThreadPinned)
  const deleteThreadMutation = useMutation(api.chat.deleteThread)
  const [optimisticPinnedById, setOptimisticPinnedById] = useState<Record<string, boolean>>({})

  const cachedThreads = useMemo(() => {
    if (!cacheUserId) {
      return [] as ThreadSummary[]
    }
    const fromLs = readThreadsCache<ThreadSummary[]>(cacheUserId)
    const list = Array.isArray(fromLs) ? fromLs : []
    return [...list].sort(compareThreadsForSidebar)
  }, [cacheUserId, cacheVersion])

  useEffect(() => {
    if (liveThreads === undefined || !cacheUserId) {
      return
    }
    cacheThreadsToLocal(cacheUserId, filterPersistableThreads(liveThreads))
  }, [liveThreads, cacheUserId])

  const threads = useMemo<ThreadSummary[]>(() => {
    const source = liveThreads ?? cachedThreads
    const normalized = source.map((thread) => {
      if ('_id' in thread) {
        const normalizedThread = normalizeThread(thread)
        const optimistic = isOptimisticThreadId(thread._id)
        return {
          ...normalizedThread,
          serverId: optimistic ? undefined : thread._id,
          isOptimistic: optimistic,
        }
      }

      return {
        ...thread,
        updatedAt: thread.lastMessageAt,
        serverId: thread.serverId,
        isOptimistic: Boolean(thread.isOptimistic),
      }
    })

    const optimistic = normalized.map((thread) => {
      const optimisticPinned =
        optimisticPinnedById[thread.serverId || thread.id] ?? optimisticPinnedById[thread.id]

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
    if (liveThreads === undefined) {
      return
    }

    setOptimisticPinnedById((current) => {
      let changed = false
      const next = { ...current }

      for (const thread of liveThreads) {
        if (isOptimisticThreadId(thread._id)) {
          continue
        }
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
  const liveThread = useQuery(api.chat.getThread, threadId ? { threadId } : 'skip')

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
