import { query } from './_generated/server'
import { v } from 'convex/values'

export const listByUserAndScopeAndScopeId = query({
  args: {
    userId: v.id('users'),
    scope: v.string(),
    scopeId: v.string(),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_user_scope_id', (q) =>
        q
          .eq('userId', args.userId)
          // @ts-expect-error - scope validation happens at runtime
          .eq('scope', args.scope)
          .eq('scopeId', args.scopeId),
      )
      .collect()

    return memories
  },
})

export const listByUserAndScope = query({
  args: {
    userId: v.id('users'),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_user_scope', (q) =>
        q
          .eq('userId', args.userId)
          // @ts-expect-error - scope validation happens at runtime
          .eq('scope', args.scope),
      )
      .collect()

    return memories
  },
})
