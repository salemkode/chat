import { query, mutation, MutationCtx, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

// Helper to check if user is admin
async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Unauthorized')

  const admin = await ctx.db
    .query('admins')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first()

  if (!admin) throw new Error('Admin access required')
  return userId
}

// Check if current user is admin
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return false

    const admin = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    return !!admin
  },
})

// List all models (admin only)
export const listAllModels = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query('models').collect()
  },
})

// List enabled models (for regular users)
export const listEnabledModels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('models')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()
  },
})

// Add a new model
export const addModel = mutation({
  args: {
    modelId: v.string(),
    displayName: v.string(),
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.insert('models', args)
  },
})

// Update a model
export const updateModel = mutation({
  args: {
    id: v.id('models'),
    modelId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    isFree: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const { id, ...updates } = args

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    )

    await ctx.db.patch('models', id, cleanUpdates)
  },
})

// Delete a model
export const deleteModel = mutation({
  args: { id: v.id('models') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    await ctx.db.delete('models', args.id)
  },
})

// Seed initial models (run once)
export const seedModels = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const existing = await ctx.db.query('models').first()
    if (existing) return 'Models already seeded'

    const defaultModels = [
      {
        modelId: 'mistralai/devstral-2512:free',
        displayName: 'Devstral (Free)',
        isEnabled: true,
        isFree: true,
        sortOrder: 0,
      },
      {
        modelId: 'openai/gpt-4o',
        displayName: 'GPT-4o',
        isEnabled: true,
        isFree: false,
        sortOrder: 1,
      },
      {
        modelId: 'openai/gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        isEnabled: true,
        isFree: false,
        sortOrder: 2,
      },
      {
        modelId: 'anthropic/claude-3-opus',
        displayName: 'Claude 3 Opus',
        isEnabled: true,
        isFree: false,
        sortOrder: 3,
      },
      {
        modelId: 'google/gemini-pro-1.5',
        displayName: 'Gemini Pro',
        isEnabled: true,
        isFree: false,
        sortOrder: 4,
      },
    ]

    for (const model of defaultModels) {
      await ctx.db.insert('models', model)
    }

    return 'Models seeded successfully'
  },
})

// Make a user an admin (for initial setup - call from Convex dashboard)
export const makeAdmin = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Check if any admins exist
    const existingAdmin = await ctx.db.query('admins').first()

    // If no admins exist, allow the first admin to be created
    // Otherwise, require current user to be admin
    if (existingAdmin) {
      await requireAdmin(ctx)
    }

    // Check if already admin
    const existing = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) return 'User is already an admin'

    await ctx.db.insert('admins', { userId: args.userId })
    return 'Admin added successfully'
  },
})
