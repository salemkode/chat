import type { Value } from 'convex/values'
import type { FunctionReturnType } from 'convex/server'
import type { OptimisticLocalStore } from 'convex/browser'
import { insertAtPosition } from 'convex/react'
import { api } from '@convex/_generated/api'

type ListMessagesPageItem = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]

function optimisticUserMessage(
  threadId: string,
  prompt: string,
  now: number,
): ListMessagesPageItem {
  const order = now
  return {
    id: `optimistic-user-${now}`,
    role: 'user',
    key: `${threadId}-${order}-0`,
    text: prompt,
    order,
    stepOrder: 0,
    status: 'success',
    _creationTime: now,
    parts: [{ type: 'text', text: prompt, state: 'done' }],
  } as ListMessagesPageItem
}

function optimisticAssistantMessage(
  threadId: string,
  now: number,
): ListMessagesPageItem {
  const order = now + 1
  return {
    id: `optimistic-assistant-${now}`,
    role: 'assistant',
    key: `${threadId}-${order}-0`,
    text: '',
    order,
    stepOrder: 0,
    status: 'streaming',
    _creationTime: now,
    parts: [],
  } as ListMessagesPageItem
}

function optimisticRegenerateAssistant(
  threadId: string,
  now: number,
  order: number,
): ListMessagesPageItem {
  return {
    id: `optimistic-regenerate-${now}`,
    role: 'assistant',
    key: `${threadId}-${order}-0`,
    text: '',
    order,
    stepOrder: 0,
    status: 'streaming',
    _creationTime: now,
    parts: [],
  } as ListMessagesPageItem
}

/**
 * `listMessages` is paginated (desc by order). Optimistic updates must patch
 * pages via `insertAtPosition`, not treat results as a flat array.
 */
export function applyOptimisticGenerateMessage(
  localStore: OptimisticLocalStore,
  threadId: string,
  prompt: string,
) {
  const now = Date.now()
  const assistant = optimisticAssistantMessage(threadId, now)
  const user = optimisticUserMessage(threadId, prompt, now)
  const sortKeyFromItem = (el: ListMessagesPageItem): Value | Value[] => [
    el.order,
    el.stepOrder,
  ]

  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: 'desc',
    sortKeyFromItem,
    item: assistant,
  })
  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: 'desc',
    sortKeyFromItem,
    item: user,
  })
}

export function applyOptimisticRegenerateMessage(
  localStore: OptimisticLocalStore,
  threadId: string,
) {
  const now = Date.now()
  const queries = localStore.getAllQueries(api.chat.listMessages)
  const first = queries.find(
    (q) =>
      q.args.threadId === threadId &&
      q.args.paginationOpts?.cursor === null &&
      q.value?.page?.length,
  )
  const topOrder = first?.value?.page[0]?.order ?? now
  const order = topOrder + 1

  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: 'desc',
    sortKeyFromItem: (el) => [el.order, el.stepOrder] as Value | Value[],
    item: optimisticRegenerateAssistant(threadId, now, order),
  })
}
