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
  stepOrder: number,
): ListMessagesPageItem {
  return {
    id: `optimistic-regenerate-${now}`,
    role: 'assistant',
    key: `${threadId}-${order}-${stepOrder}`,
    text: '',
    order,
    stepOrder,
    status: 'streaming',
    _creationTime: now,
    parts: [],
  } as ListMessagesPageItem
}

function isAfterPrompt(
  message: Pick<ListMessagesPageItem, 'order' | 'stepOrder'>,
  prompt: Pick<ListMessagesPageItem, 'order' | 'stepOrder'>,
) {
  const messageOrder = message.order ?? Number.NEGATIVE_INFINITY
  const promptOrder = prompt.order ?? Number.NEGATIVE_INFINITY
  if (messageOrder !== promptOrder) {
    return messageOrder > promptOrder
  }

  return (message.stepOrder ?? 0) > (prompt.stepOrder ?? 0)
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
  promptMessageId?: string,
) {
  const now = Date.now()
  const queries = localStore.getAllQueries(api.chat.listMessages)
  let promptMessage: ListMessagesPageItem | undefined

  if (promptMessageId) {
    for (const query of queries) {
      if (query.args.threadId !== threadId || query.args.streamArgs) {
        continue
      }

      const match = query.value?.page?.find(
        (message: ListMessagesPageItem) => message.id === promptMessageId,
      )
      if (match) {
        promptMessage = match
        break
      }
    }
  }

  if (promptMessage) {
    for (const query of queries) {
      if (query.args.threadId !== threadId || query.args.streamArgs || !query.value?.page) {
        continue
      }

      localStore.setQuery(api.chat.listMessages, query.args, {
        ...query.value,
        page: query.value.page.filter(
          (message: ListMessagesPageItem) => !isAfterPrompt(message, promptMessage),
        ),
      })
    }
  }

  const order = promptMessage?.order ?? now
  const stepOrder = (promptMessage?.stepOrder ?? 0) + 1

  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: 'desc',
    sortKeyFromItem: (el: ListMessagesPageItem): Value | Value[] => [el.order, el.stepOrder],
    item: optimisticRegenerateAssistant(threadId, now, order, stepOrder),
  })
}
