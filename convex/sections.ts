import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

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
    if (!userId) throw new Error('Unauthorized')

    // Get current max sortOrder
    const sections = await ctx.db
      .query('sections')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()

    const maxOrder = sections.reduce((max, s) => Math.max(max, s.sortOrder), -1)

    return await ctx.db.insert('sections', {
      name: args.name,
      emoji: args.emoji || '📁',
      sortOrder: maxOrder + 1,
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
    if (!userId) throw new Error('Unauthorized')

    const section = await ctx.db.get("sections", args.id)
    if (!section || section.userId !== userId) {
      throw new Error('Section not found')
    }

    const { id, ...updates } = args
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    )

    await ctx.db.patch("sections", id, cleanUpdates)
  },
})

// Delete a section
export const deleteSection = mutation({
  args: { id: v.id('sections') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const section = await ctx.db.get("sections", args.id)
    if (!section || section.userId !== userId) {
      throw new Error('Section not found')
    }

    await ctx.db.delete("sections", args.id)
  },
})

// Toggle section expanded state
export const toggleSection = mutation({
  args: { id: v.id('sections') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const section = await ctx.db.get("sections", args.id)
    if (!section || section.userId !== userId) {
      throw new Error('Section not found')
    }

    await ctx.db.patch("sections", args.id, { isExpanded: !section.isExpanded })
  },
})

// Move a thread to a different section
export const moveThreadToSection = mutation({
  args: {
    threadId: v.id('threads'),
    sectionId: v.optional(v.id('sections')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Verify thread ownership
    const thread = await ctx.db.get("threads", args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found')
    }

    // If sectionId is provided, verify section ownership
    if (args.sectionId !== undefined) {
      const section = await ctx.db.get("sections", args.sectionId)
      if (!section || section.userId !== userId) {
        throw new Error('Section not found')
      }
    }

    // Update thread's section
    await ctx.db.patch("threads", args.threadId, { sectionId: args.sectionId })
  },
})

// Get threads count per section
export const getSectionThreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const sections = await ctx.db
      .query('sections')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()

    const counts = await Promise.all(
      sections.map(async (section) => {
        const threads = await ctx.db
          .query('threads')
          .withIndex('by_sectionId', (q) => q.eq('sectionId', section._id))
          .collect()

        return {
          sectionId: section._id,
          count: threads.length,
        }
      }),
    )

    return counts
  },
})

