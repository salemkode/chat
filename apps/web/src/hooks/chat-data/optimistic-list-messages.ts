import type { Value } from 'convex/values'
import type { FunctionReturnType } from 'convex/server'
import type { OptimisticLocalStore } from 'convex/browser'
import { insertAtPosition } from 'convex/react'
import { api } from '@convex/_generated/api'

type ListMessagesPageItem = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

function optimisticUserMessage(
  threadId: string,
  prompt: string,
  order: number,
  now: number,
  clientRequestId?: string,
  attachments?: Array<{
    filename?: string
    mediaType?: string
  }>,
): ListMessagesPageItem {
  const idSuffix = clientRequestId?.trim() || now
  return {
    id: `optimistic-user-${idSuffix}`,
    role: 'user',
    key: `${threadId}-${order}-0`,
    text: prompt,
    order,
    stepOrder: 0,
    status: 'success',
    _creationTime: now,
    parts: [
      { type: 'text', text: prompt, state: 'done' },
      ...(attachments ?? []).map((attachment) => ({
        type: 'file',
        filename: attachment.filename,
        mediaType: attachment.mediaType,
      })),
    ],
  } as ListMessagesPageItem
}

function optimisticAssistantMessage(
  threadId: string,
  order: number,
  now: number,
  clientRequestId?: string,
): ListMessagesPageItem {
  const idSuffix = clientRequestId?.trim() || now
  return {
    id: `optimistic-assistant-${idSuffix}`,
    role: 'assistant',
    key: `${threadId}-${order}-1`,
    text: '',
    order,
    stepOrder: 1,
    // Keep this pending so streamed server updates can auto-merge by order/step.
    status: 'pending',
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
  attachments?: Array<{
    filename?: string
    mediaType?: string
  }>,
  clientRequestId?: string,
) {
  const now = Date.now()
  const queries = localStore.getAllQueries(api.chat.listMessages)
  let maxOrder = -1

  for (const query of queries) {
    if (query.args.threadId !== threadId || query.args.streamArgs) {
      continue
    }
    for (const message of query.value?.page ?? []) {
      maxOrder = Math.max(maxOrder, message.order)
    }
  }

  const order = maxOrder + 1
  const assistant = optimisticAssistantMessage(threadId, order, now, clientRequestId)
  const user = optimisticUserMessage(threadId, prompt, order, now, clientRequestId, attachments)
  const sortKeyFromItem = (el: ListMessagesPageItem): Value | Value[] => [el.order, el.stepOrder]

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
