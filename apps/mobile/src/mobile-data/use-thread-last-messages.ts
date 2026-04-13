import { useQuery } from 'convex/react'
import { useEffect, useMemo, useRef } from 'react'
import { api } from '../lib/convexApi'
import { upsertMessages } from '../offline/cache'
import type { MobileOfflineMessageRecord } from '../offline/types'
import { useNetworkStatus } from '../utils/network-status'

type VisibleThreadLastMessage = {
  threadId: string
  messageId: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}

function normalizeThreadIds(threadIds: string[]) {
  return Array.from(
    new Set(threadIds.map((threadId) => threadId.trim()).filter((threadId) => threadId.length > 0)),
  ).slice(0, 40)
}

export function useHydrateVisibleThreadLastMessages(args: {
  enabled: boolean
  threadIds: string[]
}) {
  const { isOnline } = useNetworkStatus()
  const threadIds = useMemo(() => normalizeThreadIds(args.threadIds), [args.threadIds])
  const shouldFetch = args.enabled && isOnline && threadIds.length > 0
  const lastMessages = (useQuery(
    api.agents.listVisibleThreadLastMessages as never,
    shouldFetch ? ({ threadIds } as never) : 'skip',
  ) ?? []) as VisibleThreadLastMessage[]
  const cachedMessageSignaturesRef = useRef(new Set<string>())

  useEffect(() => {
    if (!lastMessages.length) {
      return
    }

    const nextMessages: MobileOfflineMessageRecord[] = []

    for (const message of lastMessages) {
      const signature = `${message.threadId}:${message.messageId}:${message.createdAt}`
      if (cachedMessageSignaturesRef.current.has(signature)) {
        continue
      }
      cachedMessageSignaturesRef.current.add(signature)
      nextMessages.push({
        id: message.messageId,
        threadId: message.threadId,
        role: message.role,
        text: message.text,
        createdAt: message.createdAt,
      })
    }

    if (nextMessages.length === 0) {
      return
    }

    void upsertMessages(nextMessages)
  }, [lastMessages])
}
