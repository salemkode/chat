import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { components } from './_generated/api'
import { paginationOptsValidator } from 'convex/server'
import { listUIMessages, vStreamArgs, syncStreams } from '@convex-dev/agent'
import { ConvexError } from 'convex/values'

export const listThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    // Return empty list if not authenticated to prevent errors during load
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      paginationOpts: args.paginationOpts,
    })
  },
})

export const deleteThread = mutation({
  args: { threadId: v.id('threads') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to delete a thread',
      })
    }

    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
      threadId: args.threadId,
    })
  },
})

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view messages',
      })
    }

    // If no threadId, return empty page structure
    if (!args.threadId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'No threadId provided',
      })
    }

    // Fetches regular non-streaming messages.
    const paginated = await listUIMessages(ctx, components.agent, args)

    const streams = await syncStreams(ctx, components.agent, args)

    return { ...paginated, streams }
  },
})

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create a thread',
      })
    }

    const thread = await ctx.runMutation(
      components.agent.threads.createThread,
      {
        userId,
      },
    )

    return thread._id
  },
})

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view thread',
      })
    }

    if (!args.threadId) {
      return null
    }

    // Get thread from agent component
    const thread = await ctx.db.get(args.threadId as any)
    if (!thread) {
      return null
    }

    // Get thread metadata
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    return {
      ...thread,
      metadata,
    }
  },
})
