import { useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../lib/convexApi'
import { readThreads } from '../offline/cache'
import type { MobileOfflineThreadRecord } from '../offline/types'
import { isLocalThreadId } from './local-thread-id'
import { normalizeThread } from './normalize'

export function useThread(threadId?: string) {
  const hasLocalThreadId = isLocalThreadId(threadId)
  const liveThread = useQuery(
    api.chat.getThread,
    threadId && !hasLocalThreadId ? { threadId } : 'skip',
  )
  const [cachedThread, setCachedThread] = useState<MobileOfflineThreadRecord | null>(null)

  useEffect(() => {
    if (!threadId || hasLocalThreadId) {
      setCachedThread(null)
      return
    }
    void readThreads().then((threads) => {
      setCachedThread(threads.find((item) => item.id === threadId) ?? null)
    })
  }, [hasLocalThreadId, threadId])

  if (liveThread) {
    return normalizeThread(liveThread)
  }
  return cachedThread
}
