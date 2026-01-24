import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const getByThreadId = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    return metadata
  },
})

/**
 * Create thread metadata
 */
export const create = mutation({
  args: {
    userId: v.optional(v.id('users')),
    threadId: v.string(),
    emoji: v.string(),
    title: v.string(),
    mode: v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create'),
    ),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    metadata: v.optional(
      v.object({
        messageCount: v.optional(v.number()),
        isPinned: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? (await getAuthUserId(ctx))
    if (!userId) throw new Error('Unauthorized')

    const id = await ctx.db.insert('threadMetadata', {
      userId,
      threadId: args.threadId,
      emoji: args.emoji,
      title: args.title,
      mode: args.mode,
      createdAt: args.createdAt,
      lastActiveAt: args.lastActiveAt,
      metadata: args.metadata ?? {
        messageCount: 0,
        isPinned: false,
      },
    })

    return id
  },
})

/**
 * Update thread metadata (title, mode, etc.)
 */
export const update = mutation({
  args: {
    id: v.id('threadMetadata'),
    title: v.optional(v.string()),
    mode: v.optional(
      v.union(
        v.literal('code'),
        v.literal('learn'),
        v.literal('think'),
        v.literal('create'),
      ),
    ),
    lastActiveAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const metadata = await ctx.db.get('threadMetadata', args.id)
    if (!metadata) {
      throw new Error('Thread metadata not found')
    }

    if (metadata.userId !== userId) {
      throw new Error('Unauthorized')
    }

    const updates: {
      title?: string
      mode?: 'code' | 'learn' | 'think' | 'create'
      lastActiveAt?: number
    } = {}
    if (args.title !== undefined) updates.title = args.title
    if (args.mode !== undefined) updates.mode = args.mode
    if (args.lastActiveAt !== undefined) updates.lastActiveAt = args.lastActiveAt

    await ctx.db.patch('threadMetadata', args.id, updates)

    return {
      success: true,
    }
  },
})

/**
 * Update thread emoji
 */
export const updateEmoji = mutation({
  args: {
    id: v.id('threadMetadata'),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const metadata = await ctx.db.get('threadMetadata', args.id)
    if (!metadata) {
      throw new Error('Thread metadata not found')
    }

    if (metadata.userId !== userId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch('threadMetadata', args.id, {
      emoji: args.emoji,
    })

    return {
      success: true,
    }
  },
})
