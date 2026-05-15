import type { Value } from 'convex/values'
import type { FunctionReturnType } from 'convex/server'
import type { OptimisticLocalStore } from 'convex/browser'
import { insertAtPosition } from 'convex/react'
import {
  buildOptimisticUserRow,
  maxOrderFromMessages,
  nextOrderAfterMax,
} from '@chat/shared/logic/optimistic-list-messages-core'
import { api } from '@convex/_generated/api'

type ListMessagesPageItem = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

function listMessagesForThreadOptimistic(
  localStore: OptimisticLocalStore,
  threadId: string,
): ListMessagesPageItem[] {
  const queries = localStore.getAllQueries(api.chat.listMessages)
  const messages: ListMessagesPageItem[] = []
  for (const query of queries) {
    // Include every cached page for this thread; streaming rows are merged separately.
    if (query.args.threadId !== threadId) {
      continue
    }
    for (const message of query.value?.page ?? []) {
      messages.push(message)
    }
  }
  return messages
}

/**
 * `listMessages` is paginated (desc by order). Optimistic updates must patch
 * pages via `insertAtPosition`, not treat results as a flat array.
 *
 * Only the user message is inserted optimistically; assistant output is not.
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
  const order = nextOrderAfterMax(maxOrderFromMessages(listMessagesForThreadOptimistic(localStore, threadId)))
  const normalizedAttachments =
    attachments?.map((attachment) => ({
      filename: attachment.filename,
      mediaType: attachment.mediaType ?? 'application/octet-stream',
    })) ?? undefined

  const user = buildOptimisticUserRow({
    threadId,
    prompt,
    order,
    now,
    clientRequestId,
    attachments: normalizedAttachments,
  })
  const sortKeyFromItem = (el: ListMessagesPageItem): Value | Value[] => [el.order, el.stepOrder]

  insertAtPosition({
    localQueryStore: localStore,
    paginatedQuery: api.chat.listMessages,
    argsToMatch: { threadId },
    sortOrder: 'desc',
    sortKeyFromItem,
    item: user as ListMessagesPageItem,
  })
}
