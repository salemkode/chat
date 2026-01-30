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

// List enabled models with provider info grouped by provider
export const listModelsWithProviders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { providers: [], favorites: [], models: [] }

    // Get all enabled models
    const models = await ctx.db
      .query('models')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()

    // Get all providers
    const providers = await ctx.db
      .query('providers')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()

    // Get user's favorite models
    const favorites = await ctx.db
      .query('userFavoriteModels')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const favoriteModelIds = new Set(favorites.map((f) => f.modelId))

    // Map models with provider info and favorite status
    const modelsWithInfo = await Promise.all(
      models.map(async (model) => {
        const provider = providers.find((p) => p._id === model.providerId)
        return {
          ...model,
          provider: provider
            ? {
                _id: provider._id,
                name: provider.name,
                providerType: provider.providerType,
                icon: provider.icon,
              }
            : null,
          isFavorite: favoriteModelIds.has(model._id),
        }
      })
    )

    // Sort providers by sortOrder
    const sortedProviders = providers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        _id: p._id,
        name: p.name,
        providerType: p.providerType,
        icon: p.icon,
      }))

    return {
      providers: sortedProviders,
      favorites: modelsWithInfo.filter((m) => m.isFavorite),
      models: modelsWithInfo.sort((a, b) => a.sortOrder - b.sortOrder),
    }
  },
})

// Toggle favorite model
export const toggleFavoriteModel = mutation({
  args: { modelId: v.id('models') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Check if already favorited
    const existing = await ctx.db
      .query('userFavoriteModels')
      .withIndex('by_user_model', (q) =>
        q.eq('userId', userId).eq('modelId', args.modelId)
      )
      .first()

    if (existing) {
      // Remove from favorites
      await ctx.db.delete(existing._id)
      return { favorited: false }
    } else {
      // Add to favorites
      await ctx.db.insert('userFavoriteModels', {
        userId,
        modelId: args.modelId,
        createdAt: Date.now(),
      })
      return { favorited: true }
    }
  },
})

// List all providers (admin only)
export const listAllProviders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query('providers').collect()
  },
})

// Get provider by ID
export const getProvider = query({
  args: { id: v.id('providers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    
    const provider = await ctx.db.get('providers', args.id)
    return provider
  },
})

// Add a new provider
export const addProvider = mutation({
  args: {
    name: v.string(),
    providerType: v.union(
      v.literal('openrouter'),
      v.literal('openai'),
      v.literal('anthropic'),
      v.literal('google'),
      v.literal('azure'),
      v.literal('groq'),
      v.literal('deepseek'),
      v.literal('xai'),
    ),
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
    isEnabled: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.insert('providers', {
      name: args.name,
      providerType: args.providerType,
      apiKey: args.apiKey,
      baseURL: args.baseURL,
      isEnabled: args.isEnabled,
      sortOrder: args.sortOrder,
    })
  },
})

// Update a provider
export const updateProvider = mutation({
  args: {
    id: v.id('providers'),
    name: v.optional(v.string()),
    providerType: v.optional(v.union(
      v.literal('openrouter'),
      v.literal('openai'),
      v.literal('anthropic'),
      v.literal('google'),
      v.literal('azure'),
      v.literal('groq'),
      v.literal('deepseek'),
      v.literal('xai'),
      v.literal('cerebras')
    )),
    apiKey: v.optional(v.string()),
    baseURL: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const { id, ...updates } = args

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined),
    )

    await ctx.db.patch('providers', id, cleanUpdates)
  },
})

// Delete a provider
export const deleteProvider = mutation({
  args: { id: v.id('providers') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    
    // Check if provider has any models
    const models = await ctx.db
      .query('models')
      .withIndex('by_providerId', (q) => q.eq('providerId', args.id))
      .collect()
    
    if (models.length > 0) {
      throw new Error('Cannot delete provider with existing models. Remove models first.')
    }
    
    await ctx.db.delete('providers', args.id)
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
    providerId: v.id('providers'),
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

    const provider = await ctx.db
      .query('providers')
      .withIndex('by_providerType', (e) => e.eq('providerType', 'openrouter'))
      .first()
    if (!provider) return 'Add provider first'
    const providerId = provider._id
    const defaultModels = [
      {
        modelId: 'mistralai/devstral-2512:free',
        displayName: 'Devstral (Free)',
        isEnabled: true,
        isFree: true,
        sortOrder: 0,
        providerId,
      },
      {
        modelId: 'openai/gpt-4o',
        displayName: 'GPT-4o',
        isEnabled: true,
        isFree: false,
        sortOrder: 1,
        providerId,
      },
      {
        modelId: 'openai/gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        isEnabled: true,
        isFree: false,
        sortOrder: 2,
        providerId,
      },
      {
        modelId: 'anthropic/claude-3-opus',
        displayName: 'Claude 3 Opus',
        isEnabled: true,
        isFree: false,
        sortOrder: 3,
        providerId,
      },
      {
        modelId: 'google/gemini-pro-1.5',
        displayName: 'Gemini Pro',
        isEnabled: true,
        isFree: false,
        sortOrder: 4,
        providerId,
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
