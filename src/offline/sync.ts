import { api } from '../../convex/_generated/api'
import { offlineDb } from './db'
import { clearDraft, setLastSyncAt, storeTrustedSession } from './session'
import type {
  OfflineMessageRecord,
  OfflineModelRecord,
  OfflineOutboxItem,
  OfflineSettingsRecord,
  OfflineThreadRecord,
} from './schema'

type ConvexClientLike = {
  mutation: <T>(mutationRef: unknown, args: Record<string, unknown>) => Promise<T>
}

interface BootstrapResponse {
  user: {
    id: string
    name?: string
    email?: string
    image?: string
  } | null
  settings: {
    displayName?: string
    image?: string
    bio?: string
    updatedAt: number
  } | null
  models: OfflineModelRecord[]
  threads: OfflineThreadRecord[]
  schemaVersion: number
  syncState?: {
    lastFullSyncAt?: number
    lastDeltaSyncAt?: number
    schemaVersion: number
  }
}

async function storeThreads(threads: OfflineThreadRecord[]) {
  await offlineDb.transaction('rw', offlineDb.threads, async () => {
    for (const thread of threads) {
      await offlineDb.threads.put(thread)
    }
  })
}

async function storeMessages(messages: OfflineMessageRecord[]) {
  await offlineDb.transaction('rw', offlineDb.messages, async () => {
    for (const message of messages) {
      await offlineDb.messages.put({
        ...message,
        status: message.status ?? 'done',
      })
    }
  })
}

async function storeModels(models: OfflineModelRecord[]) {
  await offlineDb.transaction('rw', offlineDb.models, async () => {
    for (const model of models) {
      await offlineDb.models.put(model)
    }
  })
}

async function storeSettings(settings: BootstrapResponse['settings']) {
  if (!settings) return

  const record: OfflineSettingsRecord = {
    id: 'current',
    ...settings,
  }
  await offlineDb.settings.put(record)
}

export async function bootstrapOfflineData(convex: ConvexClientLike) {
  const result = (await convex.mutation(
    api.offline.bootstrapOfflineSession,
    {},
  )) as BootstrapResponse

  if (result.user) {
    await storeTrustedSession({
      userId: result.user.id,
      name: result.user.name,
      email: result.user.email,
      image: result.user.image,
      trusted: true,
      schemaVersion: result.schemaVersion,
      lastSyncedAt:
        result.syncState?.lastDeltaSyncAt ?? result.syncState?.lastFullSyncAt,
    })
  }

  await Promise.all([
    storeThreads(result.threads),
    storeModels(result.models),
    storeSettings(result.settings),
  ])

  const threadsToHydrate = [...result.threads]
    .filter((thread) => !thread.deletedAt)
    .sort((left, right) => right.lastMessageAt - left.lastMessageAt)
    .slice(0, 3)

  await Promise.all(
    threadsToHydrate.map((thread) => hydrateThreadMessages(convex, thread.id)),
  )

  const lastSyncAt =
    result.syncState?.lastDeltaSyncAt ??
    result.syncState?.lastFullSyncAt ??
    Date.now()
  await setLastSyncAt(lastSyncAt)

  return result
}

export async function pullThreadIndex(convex: ConvexClientLike) {
  const checkpoint = await offlineDb.syncMeta.get('threads')
  const result = (await convex.mutation(api.offline.pullThreadIndex, {
    sinceVersion: checkpoint?.version ?? 0,
  })) as {
    threads: OfflineThreadRecord[]
    syncState?: {
      lastDeltaSyncAt?: number
    }
  }

  await storeThreads(result.threads)

  const highestVersion = result.threads.reduce(
    (current, thread) => Math.max(current, thread.version),
    checkpoint?.version ?? 0,
  )
  await offlineDb.syncMeta.put({
    key: 'threads',
    version: highestVersion,
    updatedAt: Date.now(),
  })

  if (result.syncState?.lastDeltaSyncAt) {
    await setLastSyncAt(result.syncState.lastDeltaSyncAt)
  }

  return result
}

export async function hydrateThreadMessages(
  convex: ConvexClientLike,
  threadId: string,
) {
  const checkpointKey = `messages:${threadId}`
  const checkpoint = await offlineDb.syncMeta.get(checkpointKey)
  const result = (await convex.mutation(api.offline.pullThreadMessages, {
    threadId,
    sinceVersion: checkpoint?.version ?? 0,
  })) as {
    messages: OfflineMessageRecord[]
    syncState?: {
      lastDeltaSyncAt?: number
    }
  }

  await storeMessages(result.messages)

  const highestVersion = result.messages.reduce(
    (current, message) => Math.max(current, message.version),
    checkpoint?.version ?? 0,
  )
  await offlineDb.syncMeta.put({
    key: checkpointKey,
    version: highestVersion,
    updatedAt: Date.now(),
  })

  if (result.syncState?.lastDeltaSyncAt) {
    await setLastSyncAt(result.syncState.lastDeltaSyncAt)
  }

  return result
}

function compactOutbox(items: OfflineOutboxItem[]) {
  const deduped = new Map<string, OfflineOutboxItem>()

  for (const item of items) {
    deduped.set(item.dedupeKey, item)
  }

  return [...deduped.values()].sort(
    (left, right) => left.clientUpdatedAt - right.clientUpdatedAt,
  )
}

export async function flushOutbox(convex: ConvexClientLike) {
  const queued = await offlineDb.outbox.toArray()
  if (queued.length === 0) return

  const compacted = compactOutbox(queued)
  await convex.mutation(api.offline.pushOfflineMutations, {
    mutations: compacted.map((item) => ({
      type: item.type,
      clientUpdatedAt: item.clientUpdatedAt,
      ...item.payload,
    })),
  })

  await offlineDb.outbox.clear()
}

export async function enqueueOfflineMutation(item: OfflineOutboxItem) {
  await offlineDb.outbox.add(item)
}

export async function persistLiveMessages(
  threadId: string,
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    text: string
    parts: Array<Record<string, unknown>>
    status?: 'done' | 'streaming'
  }>,
) {
  const now = Date.now()

  await storeMessages(
    messages.map((message) => ({
      id: message.id,
      threadId,
      role: message.role,
      text: message.text,
      parts: message.parts,
      status: message.status ?? 'done',
      createdAt: now,
      updatedAt: now,
      version: now,
    })),
  )
}

export async function clearSentDraft(threadId: string) {
  await clearDraft(threadId)
}
