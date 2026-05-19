import type { Value } from 'convex/values'
import type { FunctionReturnType } from 'convex/server'
import type { OptimisticLocalStore } from 'convex/browser'
import { insertAtPosition } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  buildOptimisticUserRow,
  maxOrderFromMessages,
  nextOrderAfterMax,
} from '@chat/shared/logic/optimistic-list-messages-core'

type ListMessagesPageItem = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

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
 * `listMessages` is paginated (desc by order). Optimistic updates patch pages via
 * `insertAtPosition`. Only the user row is inserted; assistant replies arrive from the server.
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
  const orders: number[] = []

  for (const query of queries) {
    if (query.args.threadId !== threadId || query.args.streamArgs) {
      continue
    }
    for (const message of query.value?.page ?? []) {
      orders.push(message.order)
    }
  }

  const order = nextOrderAfterMax(maxOrderFromMessages(orders.map((o) => ({ order: o }))))
  const user = buildOptimisticUserRow({
    threadId,
    prompt,
    order,
    now,
    clientRequestId,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      mediaType: attachment.mediaType ?? 'application/octet-stream',
    })),
  }) as ListMessagesPageItem

  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: 'desc',
    sortKeyFromItem: (el: ListMessagesPageItem): Value | Value[] => [el.order, el.stepOrder],
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
