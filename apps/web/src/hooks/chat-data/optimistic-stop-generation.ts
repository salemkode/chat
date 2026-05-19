import type { FunctionReturnType } from 'convex/server'
import type { OptimisticLocalStore } from 'convex/browser'
import { api } from '@convex/_generated/api'

type ListMessagesPageItem = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

export function applyOptimisticStopGeneration(
  localStore: OptimisticLocalStore,
  threadId: string,
) {
  const queries = localStore.getAllQueries(api.chat.listMessages)

  for (const query of queries) {
    if (query.args.threadId !== threadId || !query.value?.page?.length) {
      continue
    }

    let changed = false
    const page = query.value.page.map((message: ListMessagesPageItem) => {
      if (
        message.role !== 'assistant' ||
        (message.status !== 'streaming' && message.status !== 'pending')
      ) {
        return message
      }

      changed = true
      return {
        ...message,
        status: 'failed',
        failureKind: 'stopped',
        failureMode: 'replace',
        failureNote: 'Generation stopped.',
      } as ListMessagesPageItem
    })

    if (!changed) {
      continue
    }

    localStore.setQuery(api.chat.listMessages, query.args, {
      ...query.value,
      page,
    })
  }
}
