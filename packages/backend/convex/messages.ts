import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
import { ConvexError } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }
    return await ctx.db
      .query('messages')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()
  },
})

export const send = mutation({
  args: {
    body: v.string(),
    role: v.union(v.literal('user'), v.literal('assistant')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return
    }

    await ctx.db.insert('messages', {
      body: args.body,
      userId,
      role: args.role,
    })
    return
  },
})
