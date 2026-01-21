import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const backfillThreadMetadata = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const threadMetadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!threadMetadata) {
      return {
        success: false,
        error: 'Thread not found',
      }
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_userId', (q) => q.eq('userId', threadMetadata.userId))
      .collect()

    const threadMessages = messages.filter(() => true)

    const messageCount = threadMessages.length

    await ctx.db.patch(threadMetadata._id, {
      metadata: {
        ...threadMetadata.metadata,
        messageCount,
      },
    })

    return {
      success: true,
      messageCount,
      lastActiveAt: threadMetadata.lastActiveAt,
    }
  },
})

export const getMigrationStats = query({
  args: {},
  handler: async (ctx) => {
    const allThreads = await ctx.db.query('threadMetadata').collect()

    const threadsWithZeroCount = allThreads.filter(
      (t) => t.metadata.messageCount === 0,
    ).length

    const threadsWithCounts = allThreads.filter(
      (t) => t.metadata.messageCount > 0,
    ).length

    const allMessages = await ctx.db.query('messages').collect()
    const totalMessages = allMessages.length

    return {
      totalThreads: allThreads.length,
      threadsWithZeroCount,
      threadsWithCounts,
      totalMessages,
    }
  },
})

export const backfillAllThreadMetadata = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50

    const allThreads = await ctx.db.query('threadMetadata').collect()

    let processed = 0
    let skipped = 0
    let errors = 0

    for (const threadMetadata of allThreads) {
      try {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_userId', (q) => q.eq('userId', threadMetadata.userId))
          .collect()

        const messageCount = messages.length

        await ctx.db.patch(threadMetadata._id, {
          metadata: {
            ...threadMetadata.metadata,
            messageCount,
          },
        })

        processed++
      } catch (error) {
        console.error(
          `Error processing thread ${threadMetadata.threadId}:`,
          error,
        )
        errors++
      }
    }

    return {
      total: allThreads.length,
      processed,
      skipped,
      errors,
    }
  },
})

export const listThreadsWithoutCounts = query({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db.query('threadMetadata').collect()

    return threads.filter((t) => t.metadata.messageCount === 0)
  },
})
