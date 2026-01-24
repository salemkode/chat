import { query, mutation, MutationCtx, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { Id } from './_generated/dataModel'

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

// ==================== PROVIDER MANAGEMENT ====================

// List all providers (admin only)
export const listProviders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.db.query('providers').collect()
  },
})

// List enabled providers (for regular users - used internally)
export const listEnabledProviders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('providers')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()
  },
})

// Add a new provider
export const addProvider = mutation({
  args: {
    name: v.string(),
    providerType: v.string(),
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
    isEnabled: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.insert('providers', args)
  },
})

// Update a provider
export const updateProvider = mutation({
  args: {
    id: v.id('providers'),
    name: v.optional(v.string()),
    providerType: v.optional(v.string()),
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

    // Check if there are models using this provider
    const models = await ctx.db
      .query('models')
      .withIndex('by_provider', (q) => q.eq('providerId', args.id))
      .collect()

    if (models.length > 0) {
      throw new Error(
        `Cannot delete provider with ${models.length} models. Please delete the models first.`,
      )
    }

    await ctx.db.delete('providers', args.id)
  },
})

// Get popular provider templates
export const getProviderTemplates = query({
  args: {},
  handler: async () => {
    return [
      {
        name: 'OpenAI',
        providerType: 'openai',
        baseURL: 'https://api.openai.com/v1',
        description: 'Official OpenAI API',
        popularModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      },
      {
        name: 'Anthropic',
        providerType: 'anthropic',
        baseURL: 'https://api.anthropic.com',
        description: 'Official Anthropic API',
        popularModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
      },
      {
        name: 'z.ai',
        providerType: 'openai',
        baseURL: 'https://api.z.ai/v1',
        description: 'z.ai OpenAI-compatible API',
        popularModels: ['gpt-4o', 'gpt-4-turbo'],
      },
      {
        name: 'OpenRouter',
        providerType: 'openrouter',
        baseURL: 'https://openrouter.ai/api/v1',
        description: 'Access to 100+ models via single API',
        popularModels: ['anthropic/claude-3-opus', 'openai/gpt-4o'],
      },
      {
        name: 'Groq',
        providerType: 'openai',
        baseURL: 'https://api.groq.com/openai/v1',
        description: 'Ultra-fast inference',
        popularModels: ['llama3-70b-8192', 'mixtral-8x7b-32768'],
      },
      {
        name: 'Together AI',
        providerType: 'openai',
        baseURL: 'https://api.together.xyz/v1',
        description: 'Open-source models at scale',
        popularModels: ['mistralai/Mixtral-8x7B-Instruct-v0.1'],
      },
      {
        name: 'Custom OpenAI-Compatible',
        providerType: 'openai',
        baseURL: '',
        description: 'Any OpenAI-compatible API (LM Studio, Ollama, etc.)',
        popularModels: [],
      },
    ]
  },
})

// ==================== MODEL MANAGEMENT ====================

// List all models with provider info (admin only)
export const listAllModels = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const models = await ctx.db.query('models').collect()
    const providers = await ctx.db.query('providers').collect()

    return models.map((model) => ({
      ...model,
      provider: providers.find((p) => p._id === model.providerId),
    }))
  },
})

// List enabled models with provider info (for regular users)
export const listEnabledModels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const models = await ctx.db
      .query('models')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()

    const providers = await ctx.db
      .query('providers')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()

    return models
      .filter((model) => {
        const provider = providers.find((p) => p._id === model.providerId)
        return provider && provider.isEnabled
      })
      .map((model) => ({
        ...model,
        provider: providers.find((p) => p._id === model.providerId),
      }))
  },
})

// Add a new model
export const addModel = mutation({
  args: {
    modelId: v.string(),
    displayName: v.string(),
    providerId: v.optional(v.id('providers')),
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    // Verify provider exists if provided
    if (args.providerId) {
      const provider = await ctx.db.get("providers", args.providerId)
      if (!provider) {
        throw new Error('Provider not found')
      }
    }

    return await ctx.db.insert('models', args)
  },
})

// Update a model
export const updateModel = mutation({
  args: {
    id: v.id('models'),
    modelId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    providerId: v.optional(v.id('providers')),
    isEnabled: v.optional(v.boolean()),
    isFree: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const { id, ...updates } = args

    // If updating providerId, verify it exists
    if (updates.providerId) {
      const provider = await ctx.db.get("providers", updates.providerId)
      if (!provider) {
        throw new Error('Provider not found')
      }
    }

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

// Migrate existing models to use default provider
export const migrateModelsToProviders = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    // Check if migration is needed
    const modelsWithoutProvider = await ctx.db
      .query('models')
      .collect()
      .then((models) => models.filter((m) => !m.providerId))

    if (modelsWithoutProvider.length === 0) {
      return 'No migration needed'
    }

    // Create a default OpenRouter provider if it doesn't exist
    const defaultProvider = await ctx.db
      .query('providers')
      .filter((q) => q.eq('name', 'OpenRouter (Default)'))
      .first()

    let providerId: Id<'providers'>
    if (!defaultProvider) {
      providerId = await ctx.db.insert('providers', {
        name: 'OpenRouter (Default)',
        providerType: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || '',
        isEnabled: !!process.env.OPENROUTER_API_KEY,
        sortOrder: 0,
      })
    } else {
      providerId = defaultProvider._id
    }

    // Update all models without a provider
    let migrated = 0
    for (const model of modelsWithoutProvider) {
      await ctx.db.patch("models", model._id, {
        providerId,
      })
      migrated++
    }

    return `Migrated ${migrated} models to default provider`
  },
})

// Seed initial providers and models (run once)
export const seedProvidersAndModels = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const existingProviders = await ctx.db.query('providers').first()
    if (existingProviders) return 'Already seeded'

    // Create default providers (without API keys - user needs to add them)
    const openRouterProvider = await ctx.db.insert('providers', {
      name: 'OpenRouter',
      providerType: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      isEnabled: !!process.env.OPENROUTER_API_KEY,
      sortOrder: 0,
    })

    // Seed default models using OpenRouter
    const defaultModels = [
      {
        modelId: 'mistralai/devstral-2512:free',
        displayName: 'Devstral (Free)',
        providerId: openRouterProvider,
        isEnabled: true,
        isFree: true,
        sortOrder: 0,
      },
      {
        modelId: 'openai/gpt-4o',
        displayName: 'GPT-4o',
        providerId: openRouterProvider,
        isEnabled: false, // Disabled by default until user adds their own API key
        isFree: false,
        sortOrder: 1,
      },
      {
        modelId: 'openai/gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        providerId: openRouterProvider,
        isEnabled: false,
        isFree: false,
        sortOrder: 2,
      },
      {
        modelId: 'anthropic/claude-3-opus',
        displayName: 'Claude 3 Opus',
        providerId: openRouterProvider,
        isEnabled: false,
        isFree: false,
        sortOrder: 3,
      },
      {
        modelId: 'google/gemini-pro-1.5',
        displayName: 'Gemini Pro',
        providerId: openRouterProvider,
        isEnabled: false,
        isFree: false,
        sortOrder: 4,
      },
    ]

    for (const model of defaultModels) {
      await ctx.db.insert('models', model)
    }

    return 'Providers and models seeded successfully'
  },
})

// Make a user an admin (for initial setup - call from Convex dashboard)
export const makeAdmin = mutation({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    // Get userId from args or use current user
    let userId: Id<'users'> | undefined = args.userId
    if (!userId) {
      const authUserId = await getAuthUserId(ctx)
      if (!authUserId) throw new Error('Not authenticated')
      userId = authUserId
    }

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
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (existing) return 'User is already an admin'

    await ctx.db.insert('admins', { userId })
    return 'Admin added successfully'
  },
})

// Temporary: Make current user an admin (for initial setup)
export const makeMeAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Check if any admins exist
    const existingAdmin = await ctx.db.query('admins').first()

    // If no admins exist, allow the first admin to be created
    if (existingAdmin) {
      throw new Error('Admin already exists. Use makeAdmin mutation with explicit userId.')
    }

    // Check if already admin
    const existing = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (existing) return 'User is already an admin'

    await ctx.db.insert('admins', { userId })
    return 'Admin added successfully'
  },
})
