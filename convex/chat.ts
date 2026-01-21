import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { components } from './_generated/api'
import { paginationOptsValidator } from 'convex/server'
import { listUIMessages, vStreamArgs, syncStreams } from '@convex-dev/agent'

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
    if (!userId) throw new Error('Unauthorized')

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
    if (!userId) throw new Error('Unauthorized')

    // If no threadId, return empty page structure
    if (!args.threadId) throw new Error('No threadId provided')

    // Fetches the regular non-streaming messages.
    const paginated = await listUIMessages(ctx, components.agent, args)

    const streams = await syncStreams(ctx, components.agent, args)

    return { ...paginated, streams }
  },
})
