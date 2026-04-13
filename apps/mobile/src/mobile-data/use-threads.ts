import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/convexApi'
import { cacheThreads, readThreads } from '../offline/cache'
import type { MobileOfflineThreadRecord } from '../offline/types'
import { useNetworkStatus } from '../utils/network-status'
import { normalizeThread } from './normalize'
import { type ThreadsWithMetadata, withOptimisticThreads } from './optimistic'

export function useThreads() {
  const { isOnline } = useNetworkStatus()
  const liveThreadsQuery = useQuery(api.agents.listThreadsWithMetadata as never)
  const liveThreads: ThreadsWithMetadata = Array.isArray(liveThreadsQuery) ? liveThreadsQuery : []
  const [cachedThreads, setCachedThreads] = useState<MobileOfflineThreadRecord[]>([])
  const setThreadPinned = useMutation(api.agents.setThreadPinned as never).withOptimisticUpdate(
    (localStore, args: { threadId: string; pinned: boolean }) => {
      withOptimisticThreads(localStore, (threads) =>
        threads.map((thread) =>
          thread._id === args.threadId
            ? {
                ...thread,
                metadata:
                  thread.metadata === null
                    ? null
                    : {
                        ...thread.metadata,
                        sortOrder: args.pinned ? 1 : 0,
                      },
              }
            : thread,
        ),
      )
    },
  )
  const deleteThreadMutation = useMutation(api.chat.deleteThread).withOptimisticUpdate(
    (localStore, args: { threadId: string }) => {
      withOptimisticThreads(localStore, (threads) =>
        threads.filter((thread) => thread._id !== args.threadId),
      )
    },
  )

  useEffect(() => {
    void readThreads().then(setCachedThreads)
  }, [])

  useEffect(() => {
    const normalized = liveThreads.map(normalizeThread)
    setCachedThreads(normalized)
    void cacheThreads(normalized)
  }, [liveThreads])

  const threads = useMemo(() => {
    const source = liveThreads.length ? liveThreads.map(normalizeThread) : cachedThreads
    return [...source].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
      return right.updatedAt - left.updatedAt
    })
  }, [cachedThreads, liveThreads])

  return {
    threads,
    setPinned: useCallback(
      async (threadId: string, pinned: boolean) => {
        if (!isOnline) return
        await setThreadPinned({ threadId, pinned } as never)
      },
      [isOnline, setThreadPinned],
    ),
    deleteThread: useCallback(
      async (threadId: string) => {
        if (!isOnline) return
        await deleteThreadMutation({ threadId })
      },
      [deleteThreadMutation, isOnline],
    ),
  }
}
