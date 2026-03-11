import { v, ConvexError } from 'convex/values'
import { mutation } from './_generated/server'
import { components, api } from './_generated/api'
import { getAuthUserId } from './lib/auth'
import { listUIMessages } from '@convex-dev/agent'
import type { Id } from './_generated/dataModel'
import {
  ensureOfflineSyncState,
  getOfflineSchemaVersion,
  markMissingMessagesDeleted,
  markMissingThreadsDeleted,
  parsePartsJson,
  upsertOfflineMessage,
  upsertOfflineThread,
} from './offlineHelpers'

const offlineMutationValidator = v.union(
  v.object({
    type: v.literal('settings'),
    displayName: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    clientUpdatedAt: v.number(),
  }),
  v.object({
    type: v.literal('favorite'),
    modelId: v.id('models'),
    isFavorite: v.boolean(),
    clientUpdatedAt: v.number(),
  }),
  v.object({
    type: v.literal('pinThread'),
    threadId: v.string(),
    pinned: v.boolean(),
    clientUpdatedAt: v.number(),
  }),
  v.object({
    type: v.literal('threadIcon'),
    threadId: v.string(),
    icon: v.string(),
    clientUpdatedAt: v.number(),
  }),
  v.object({
    type: v.literal('deleteThread'),
    threadId: v.string(),
    clientUpdatedAt: v.number(),
  }),
)

async function requireOfflineUser(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to use offline sync',
    })
  }
  return userId
}

async function syncThreadIndex(ctx: any, userId: any) {
  const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
    userId,
    paginationOpts: { numItems: 100, cursor: null },
  })
  const metadata = await ctx.db
    .query('threadMetadata')
    .withIndex('by_userId', (q: any) => q.eq('userId', userId))
    .collect()

  const now = Date.now()
  const remoteThreadIds = new Set<string>()

  for (const thread of threads.page) {
    remoteThreadIds.add(thread._id)
    const threadMetadata = metadata.find((entry: any) => entry.threadId === thread._id)
    await upsertOfflineThread(
      ctx,
      userId,
      {
        _id: thread._id,
        title: thread.title,
        _creationTime: thread._creationTime,
        metadata: threadMetadata
          ? {
              emoji: threadMetadata.emoji,
              icon: threadMetadata.icon,
              sortOrder: threadMetadata.sortOrder,
              _creationTime: threadMetadata._creationTime,
            }
          : null,
      },
      now,
    )
  }

  await markMissingThreadsDeleted(ctx, userId, remoteThreadIds, now)
  await ensureOfflineSyncState(ctx, userId, {
    lastDeltaSyncAt: now,
  })

  return await ctx.db
    .query('chatThreads')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect()
}

async function syncThreadMessages(ctx: any, userId: any, threadId: string) {
  const now = Date.now()
  const paginated = await listUIMessages(ctx, components.agent, {
    threadId,
    paginationOpts: { numItems: 500, cursor: null },
    streamArgs: {},
  } as any)

  const remoteMessageIds = new Set<string>()

  for (const message of paginated.page) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue
    }
    remoteMessageIds.add(message.id)
    await upsertOfflineMessage(
      ctx,
      userId,
      threadId,
      {
        id: message.id,
        role: message.role,
        text: message.text,
        parts: message.parts,
      },
      now,
    )
  }

  await markMissingMessagesDeleted(ctx, userId, threadId, remoteMessageIds, now)

  const thread = await ctx.db
    .query('chatThreads')
    .withIndex('by_user_remoteThreadId', (q: any) =>
      q.eq('userId', userId).eq('remoteThreadId', threadId),
    )
    .unique()

  if (thread) {
    await ctx.db.patch(thread._id, {
      lastMessageAt: now,
      updatedAt: now,
      version: now,
    })
  }

  await ensureOfflineSyncState(ctx, userId, {
    lastDeltaSyncAt: now,
  })

  return await ctx.db
    .query('chatMessages')
    .withIndex('by_thread', (q: any) => q.eq('threadId', threadId))
    .collect()
}

function serializeThread(thread: any) {
  return {
    id: thread.remoteThreadId,
    title: thread.title,
    emoji: thread.emoji,
    icon: thread.icon,
    pinned: thread.pinned,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastMessageAt: thread.lastMessageAt,
    deletedAt: thread.deletedAt,
    version: thread.version,
  }
}

function serializeMessage(message: any) {
  return {
    id: message.remoteMessageId,
    threadId: message.threadId,
    role: message.role,
    text: message.text,
    parts: parsePartsJson(message.partsJson),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    deletedAt: message.deletedAt,
    version: message.version,
  }
}

export const bootstrapOfflineSession = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOfflineUser(ctx)
    const user = await ctx.db.get(userId as Id<'users'>)
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const threads = await syncThreadIndex(ctx, userId)

    const models = await ctx.db
      .query('models')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()
    const favorites = await ctx.db
      .query('userFavoriteModels')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const favoriteModelIds = new Set(favorites.map((entry) => entry.modelId))

    const syncState = await ensureOfflineSyncState(ctx, userId, {
      lastFullSyncAt: Date.now(),
      lastDeltaSyncAt: Date.now(),
    })

    return {
      schemaVersion: getOfflineSchemaVersion(),
      user: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
          }
        : null,
      settings: settings
        ? {
            displayName: settings.displayName,
            image: settings.image,
            bio: settings.bio,
            updatedAt: settings.updatedAt,
          }
        : null,
      models: models.map((model) => ({
        id: model._id,
        modelId: model.modelId,
        displayName: model.displayName,
        description: model.description,
        sortOrder: model.sortOrder,
        isFavorite: favoriteModelIds.has(model._id),
      })),
      threads: threads.map(serializeThread),
      syncState,
    }
  },
})

export const pullThreadIndex = mutation({
  args: {
    sinceVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireOfflineUser(ctx)
    await syncThreadIndex(ctx, userId)

    const allThreads = await ctx.db
      .query('chatThreads')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return {
      schemaVersion: getOfflineSchemaVersion(),
      threads: allThreads
        .filter((thread) => thread.version > (args.sinceVersion ?? 0))
        .map(serializeThread),
      syncState: await ensureOfflineSyncState(ctx, userId),
    }
  },
})

export const pullThreadMessages = mutation({
  args: {
    threadId: v.string(),
    sinceVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireOfflineUser(ctx)
    const messages = await syncThreadMessages(ctx, userId, args.threadId)

    return {
      schemaVersion: getOfflineSchemaVersion(),
      threadId: args.threadId,
      messages: messages
        .filter((message: any) => message.version > (args.sinceVersion ?? 0))
        .map(serializeMessage),
      syncState: await ensureOfflineSyncState(ctx, userId),
    }
  },
})

export const pushOfflineMutations = mutation({
  args: {
    mutations: v.array(offlineMutationValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireOfflineUser(ctx)

    for (const mutationItem of args.mutations) {
      if (mutationItem.type === 'settings') {
        await ctx.runMutation(api.users.updateSettings, {
          displayName: mutationItem.displayName,
          image: mutationItem.image,
          bio: mutationItem.bio,
          clientUpdatedAt: mutationItem.clientUpdatedAt,
        })
        continue
      }

      if (mutationItem.type === 'favorite') {
        await ctx.runMutation(api.admin.setFavoriteModel, {
          modelId: mutationItem.modelId,
          isFavorite: mutationItem.isFavorite,
          clientUpdatedAt: mutationItem.clientUpdatedAt,
        })
        continue
      }

      if (mutationItem.type === 'pinThread') {
        await ctx.runMutation(api.agents.setThreadPinned, {
          threadId: mutationItem.threadId,
          pinned: mutationItem.pinned,
          clientUpdatedAt: mutationItem.clientUpdatedAt,
        })
        continue
      }

      if (mutationItem.type === 'threadIcon') {
        await ctx.runMutation(api.agents.updateThreadIcon, {
          threadId: mutationItem.threadId,
          icon: mutationItem.icon,
          clientUpdatedAt: mutationItem.clientUpdatedAt,
        })
        continue
      }

      if (mutationItem.type === 'deleteThread') {
        await ctx.runMutation(api.chat.deleteThread, {
          threadId: mutationItem.threadId as any,
          clientUpdatedAt: mutationItem.clientUpdatedAt,
        })
      }
    }

    await ensureOfflineSyncState(ctx, userId, {
      lastDeltaSyncAt: Date.now(),
    })

    return { success: true }
  },
})

export const hydrateOfflineThread = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireOfflineUser(ctx)
    const messages = await syncThreadMessages(ctx, userId, args.threadId)
    return {
      threadId: args.threadId,
      messages: messages.map(serializeMessage),
    }
  },
})
