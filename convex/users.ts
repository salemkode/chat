import { query, mutation } from './_generated/server'
import { getAuthUserId } from './lib/auth'
import { v } from 'convex/values'

export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }
    return userId
  },
})

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return null
    }
    const user = await ctx.db.get('users', userId)
    if (!user) return null

    // Get user settings
    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    return {
      ...user,
      settings: settings || null,
    }
  },
})

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return null
    }

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    return settings
  },
})

export const updateSettings = mutation({
  args: {
    displayName: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new Error('Not authenticated')
    }

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.displayName !== undefined && {
          displayName: args.displayName,
        }),
        ...(args.image !== undefined && { image: args.image }),
        ...(args.bio !== undefined && { bio: args.bio }),
        updatedAt: now,
      })
    } else {
      await ctx.db.insert('userSettings', {
        userId,
        displayName: args.displayName,
        image: args.image,
        bio: args.bio,
        updatedAt: now,
      })
    }

    return { success: true }
  },
})
