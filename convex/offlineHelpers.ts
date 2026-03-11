import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

type Ctx = MutationCtx

type RemoteThread = {
  _id: string
  title?: string
  _creationTime: number
  metadata?: {
    emoji?: string
    icon?: string
    sortOrder?: number
    _creationTime?: number
  } | null
}

type RemoteMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  parts: unknown[]
}

const OFFLINE_SCHEMA_VERSION = 1

export function getOfflineSchemaVersion() {
  return OFFLINE_SCHEMA_VERSION
}

export async function ensureOfflineSyncState(
  ctx: Ctx,
  userId: Id<'users'>,
  patch?: {
    lastFullSyncAt?: number
    lastDeltaSyncAt?: number
  },
) {
  const existing = await ctx.db
    .query('offlineSyncState')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .unique()

  if (existing) {
    if (patch) {
      await ctx.db.patch(existing._id, {
        ...patch,
        schemaVersion: OFFLINE_SCHEMA_VERSION,
      })
    }
    return {
      ...existing,
      ...patch,
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    }
  }

  const created = {
    userId,
    lastFullSyncAt: patch?.lastFullSyncAt,
    lastDeltaSyncAt: patch?.lastDeltaSyncAt,
    schemaVersion: OFFLINE_SCHEMA_VERSION,
  }
  const id = await ctx.db.insert('offlineSyncState', created)
  return { _id: id, ...created }
}

export async function upsertOfflineThread(
  ctx: Ctx,
  userId: Id<'users'>,
  thread: RemoteThread,
  now = Date.now(),
) {
  const existing = await ctx.db
    .query('chatThreads')
    .withIndex('by_user_remoteThreadId', (q) =>
      q.eq('userId', userId).eq('remoteThreadId', thread._id),
    )
    .unique()

  const payload = {
    userId,
    remoteThreadId: thread._id,
    title: thread.title || 'New Chat',
    emoji: thread.metadata?.emoji || '💬',
    icon: thread.metadata?.icon,
    pinned: thread.metadata?.sortOrder === 1,
    createdAt: existing?.createdAt || thread._creationTime,
    updatedAt: now,
    lastMessageAt: Math.max(existing?.lastMessageAt || 0, thread._creationTime),
    deletedAt: undefined,
    version: now,
  }

  if (existing) {
    await ctx.db.patch(existing._id, payload)
    return { ...existing, ...payload }
  }

  const id = await ctx.db.insert('chatThreads', payload)
  return { _id: id, ...payload }
}

export async function markMissingThreadsDeleted(
  ctx: Ctx,
  userId: Id<'users'>,
  remoteThreadIds: Set<string>,
  now = Date.now(),
) {
  const existing = await ctx.db
    .query('chatThreads')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  await Promise.all(
    existing
      .filter((thread) => !remoteThreadIds.has(thread.remoteThreadId) && !thread.deletedAt)
      .map((thread) =>
        ctx.db.patch(thread._id, {
          deletedAt: now,
          updatedAt: now,
          version: now,
        }),
      ),
  )
}

export async function upsertOfflineMessage(
  ctx: Ctx,
  userId: Id<'users'>,
  threadId: string,
  message: RemoteMessage,
  now = Date.now(),
) {
  const existing = await ctx.db
    .query('chatMessages')
    .withIndex('by_user_remoteMessageId', (q) =>
      q.eq('userId', userId).eq('remoteMessageId', message.id),
    )
    .unique()

  const payload = {
    userId,
    threadId,
    remoteMessageId: message.id,
    role: message.role,
    text: message.text,
    partsJson: JSON.stringify(message.parts || []),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: undefined,
    version: now,
  }

  if (existing) {
    await ctx.db.patch(existing._id, payload)
    return { ...existing, ...payload }
  }

  const id = await ctx.db.insert('chatMessages', payload)
  return { _id: id, ...payload }
}

export async function markMissingMessagesDeleted(
  ctx: Ctx,
  userId: Id<'users'>,
  threadId: string,
  remoteMessageIds: Set<string>,
  now = Date.now(),
) {
  const existing = await ctx.db
    .query('chatMessages')
    .withIndex('by_thread', (q) => q.eq('threadId', threadId))
    .collect()

  await Promise.all(
    existing
      .filter(
        (message) =>
          message.userId === userId &&
          !remoteMessageIds.has(message.remoteMessageId) &&
          !message.deletedAt,
      )
      .map((message) =>
        ctx.db.patch(message._id, {
          deletedAt: now,
          updatedAt: now,
          version: now,
        }),
      ),
  )
}

export function parsePartsJson(partsJson: string): unknown[] {
  try {
    return JSON.parse(partsJson)
  } catch {
    return []
  }
}
