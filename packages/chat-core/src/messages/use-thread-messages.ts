import { mergeMessageLists } from '@chat/shared/logic/merge-message-lists'
import { sortChatMessages } from '@chat/shared/logic/message-order'
import { useMemo } from 'react'
import type { UsePaginatedQueryResult } from 'convex/react'
import type { ChatMessage } from '../types'
import { useSendRegistryOptional } from '../send/send-registry'

export type UseThreadMessagesInput = {
  threadId?: string
  threadKey?: string
  liveResults: ChatMessage[] | undefined
  persistedMessages: ChatMessage[]
  paginatedStatus?: UsePaginatedQueryResult<ChatMessage>['status']
  loadMore?: (numItems: number) => void
}

export type UseThreadMessagesResult = {
  messages: ChatMessage[]
  status: UsePaginatedQueryResult<ChatMessage>['status'] | 'LoadingFirstPage'
  hasMore: boolean
  isLoadingMore: boolean
  hasRenderableMessages: boolean
  loadOlderMessages: (numItems: number) => void
}

function normalizeLiveMessages(
  threadId: string | undefined,
  results: ChatMessage[] | undefined,
): ChatMessage[] | undefined {
  if (!threadId) {
    return undefined
  }
  if (results === undefined) {
    return undefined
  }
  return sortChatMessages(
    results.map((message) => ({
      ...message,
      createdAt: message.createdAt ?? message.order,
    })),
  )
}

export function useThreadMessages({
  threadId,
  threadKey,
  liveResults,
  persistedMessages,
  paginatedStatus = 'LoadingFirstPage',
  loadMore,
}: UseThreadMessagesInput): UseThreadMessagesResult {
  const sendRegistry = useSendRegistryOptional()
  const resolvedThreadKey = threadKey ?? threadId ?? 'new'

  const liveMessages = useMemo(
    () => normalizeLiveMessages(threadId, liveResults),
    [liveResults, threadId],
  )

  const orderedPersisted = useMemo(
    () => sortChatMessages(persistedMessages),
    [persistedMessages],
  )

  const inFlightSends = useMemo(() => {
    if (!sendRegistry) {
      return []
    }
    return sendRegistry.selectInFlightSendsForMerge(
      resolvedThreadKey,
      liveMessages ?? [],
    )
  }, [liveMessages, resolvedThreadKey, sendRegistry])

  const messages = useMemo(() => {
    const merged = mergeMessageLists({
      live: liveMessages,
      persisted: orderedPersisted,
      inFlightSends,
    })
    return merged as ChatMessage[]
  }, [inFlightSends, liveMessages, orderedPersisted])

  const loadOlderMessages = useMemo(
    () => loadMore ?? (() => {}),
    [loadMore],
  )

  return {
    messages,
    status: paginatedStatus,
    hasMore: paginatedStatus === 'CanLoadMore' || paginatedStatus === 'LoadingMore',
    isLoadingMore: paginatedStatus === 'LoadingMore',
    hasRenderableMessages: messages.length > 0,
    loadOlderMessages,
  }
}
