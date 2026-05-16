import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
import { ConvexError } from 'convex/values'

// List all sections for the current user
export const listSections = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('sections')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()
  },
})

// Create a new section
export const createSection = mutation({
  args: {
    name: v.string(),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    return await ctx.db.insert('sections', {
      name: args.name,
      emoji: args.emoji || '📁',
      sortOrder: Date.now(),
      userId,
      isExpanded: true,
    })
  },
})

// Update a section (toggle expanded, rename, etc.)
export const updateSection = mutation({
  args: {
    id: v.id('sections'),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
    isExpanded: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return
    }

    const section = await ctx.db.get(args.id)
    if (!section || section.userId !== userId) {
      return
    }

    const { id, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    )

    await ctx.db.patch(id, cleanUpdates)
    return
  },
})

// Delete a section
export const deleteSection = mutation({
  args: { id: v.id('sections') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return
    }

    const section = await ctx.db.get(args.id)
    if (!section || section.userId !== userId) {
      return
    }

    await ctx.db.delete(args.id)
    return
  },
})

// Toggle section expanded state
export const toggleSection = mutation({
  args: { id: v.id('sections') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return
    }

    const section = await ctx.db.get(args.id)
    if (!section || section.userId !== userId) {
      return
    }

    await ctx.db.patch(args.id, { isExpanded: !section.isExpanded })
    return
  },
})
