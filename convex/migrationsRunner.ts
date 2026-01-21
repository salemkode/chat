import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'

export const backfillAllThreadMetadata = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50

    const allThreads = await ctx.db.query('threadMetadata').collect()

    const results = {
      total: allThreads.length,
      processed: 0,
      skipped: 0,
      errors: 0,
    }

    for (const thread of allThreads) {
      try {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_userId', (q) => q.eq('userId', thread.userId))
          .collect()

        const messageCount = messages.length

        await ctx.db.patch(thread._id, {
          metadata: {
            ...thread.metadata,
            messageCount,
          },
        })

        results.processed++
      } catch (error) {
        console.error(`Error processing thread ${thread.threadId}:`, error)
        results.errors++
      }
    }

    return results
  },
})

export const getMigrationStats = query({
  args: {},
  handler: async (ctx) => {
    const allThreads = await ctx.db.query('threadMetadata').collect()

    const stats = {
      totalThreads: allThreads.length,
      threadsWithZeroCount: 0,
      threadsWithCounts: 0,
      totalMessages: 0,
    }

    for (const thread of allThreads) {
      if (thread.metadata.messageCount === 0) {
        stats.threadsWithZeroCount++
      } else {
        stats.threadsWithCounts++
      }
    }

    const allMessages = await ctx.db.query('messages').collect()
    stats.totalMessages = allMessages.length

    return stats
  },
})
