import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { internal } from './_generated/api'
import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
import { fetchProviderCatalog } from './lib/providerCatalog'

const DAY_MS = 24 * 60 * 60 * 1000

const providerTypeValidator = v.union(
  v.literal('openrouter'),
  v.literal('openai'),
  v.literal('anthropic'),
  v.literal('google'),
  v.literal('azure'),
  v.literal('groq'),
  v.literal('deepseek'),
  v.literal('xai'),
  v.literal('cerebras'),
  v.literal('openai-compatible'),
  v.literal('opencode'),
  v.literal('mistral'),
  v.literal('cohere'),
  v.literal('perplexity'),
  v.literal('fireworks'),
  v.literal('together'),
  v.literal('replicate'),
  v.literal('moonshot'),
  v.literal('qwen'),
  v.literal('stepfun'),
)

const iconTypeValidator = v.union(
  v.literal('emoji'),
  v.literal('lucide'),
  v.literal('upload'),
)

const rateLimitPolicyValidator = v.object({
  enabled: v.boolean(),
  scope: v.union(v.literal('global'), v.literal('user')),
  kind: v.union(v.literal('fixed window'), v.literal('token bucket')),
  rate: v.number(),
  period: v.number(),
  capacity: v.optional(v.number()),
  shards: v.optional(v.number()),
})

const providerConfigValidator = v.object({
  organization: v.optional(v.string()),
  project: v.optional(v.string()),
  headers: v.optional(v.record(v.string(), v.string())),
  queryParams: v.optional(v.record(v.string(), v.string())),
})

const modalitiesValidator = v.object({
  input: v.array(v.string()),
  output: v.array(v.string()),
})

const discoveredModelValidator = v.object({
  modelId: v.string(),
  displayName: v.string(),
  description: v.optional(v.string()),
  ownedBy: v.optional(v.string()),
  contextWindow: v.optional(v.number()),
  maxOutputTokens: v.optional(v.number()),
  modalities: v.optional(modalitiesValidator),
})

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  const admin = await ctx.db
    .query('admins')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first()

  if (!admin) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Admin access required to perform this action',
    })
  }

  return userId
}

async function getCurrentAdminSettings(ctx: QueryCtx | MutationCtx) {
  const settings = await ctx.db
    .query('adminSettings')
    .withIndex('by_key', (q) => q.eq('key', 'global'))
    .first()

  return (
    settings ?? {
      _id: undefined,
      key: 'global',
      defaultRateLimit: undefined,
      updatedAt: 0,
    }
  )
}

function cleanUpdates<T extends Record<string, unknown>>(updates: T) {
  return Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  )
}

function normalizeIsFree(modelId: string) {
  return modelId.includes(':free') || modelId.endsWith('-free')
}

export const getAdminContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { userId: null, isAdmin: false }
    }

    const admin = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    return {
      userId,
      isAdmin: Boolean(admin),
    }
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return false
    }

    const admin = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    return Boolean(admin)
  },
})

export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return await getCurrentAdminSettings(ctx)
  },
})

export const updateAdminSettings = mutation({
  args: {
    defaultRateLimit: v.optional(rateLimitPolicyValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const existing = await ctx.db
      .query('adminSettings')
      .withIndex('by_key', (q) => q.eq('key', 'global'))
      .first()

    const patch = {
      key: 'global',
      defaultRateLimit: args.defaultRateLimit,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert('adminSettings', patch)
  },
})

export const listAllProviders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const providers = await ctx.db.query('providers').collect()
    return await Promise.all(
      providers
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (provider) => ({
          ...provider,
          iconUrl: provider.iconId
            ? await ctx.storage.getUrl(provider.iconId)
            : undefined,
        })),
    )
  },
})

export const listAllModels = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const [models, providers] = await Promise.all([
      ctx.db.query('models').collect(),
      ctx.db.query('providers').collect(),
    ])
    const providerMap = new Map(providers.map((provider) => [provider._id, provider]))

    return await Promise.all(
      models
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (model) => {
          const provider = providerMap.get(model.providerId)
          return {
            ...model,
            iconUrl: model.iconId ? await ctx.storage.getUrl(model.iconId) : undefined,
            providerName: provider?.name ?? 'Unknown Provider',
            provider,
          }
        }),
    )
  },
})

export const listEnabledModels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const [models, providers] = await Promise.all([
      ctx.db
        .query('models')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db
        .query('providers')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
    ])

    const enabledProviderIds = new Set(providers.map((provider) => provider._id))

    return models
      .filter((model) => enabledProviderIds.has(model.providerId))
      .sort((left, right) => left.sortOrder - right.sortOrder)
  },
})

export const listModelsWithProviders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { providers: [], favorites: [], models: [] }
    }

    const [models, providers, favorites] = await Promise.all([
      ctx.db
        .query('models')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db
        .query('providers')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db
        .query('userFavoriteModels')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
    ])

    const favoriteModelIds = new Set(favorites.map((favorite) => favorite.modelId))
    const providerMap = new Map(providers.map((provider) => [provider._id, provider]))

    const modelsWithInfo = await Promise.all(
      models
        .filter((model) => providerMap.has(model.providerId))
        .map(async (model) => {
          const provider = providerMap.get(model.providerId)
          const providerIconUrl = provider?.iconId
            ? await ctx.storage.getUrl(provider.iconId)
            : undefined
          const modelIconUrl = model.iconId
            ? await ctx.storage.getUrl(model.iconId)
            : undefined

          return {
            ...model,
            iconUrl: modelIconUrl,
            provider: provider
              ? {
                  _id: provider._id,
                  name: provider.name,
                  providerType: provider.providerType,
                  icon: provider.icon,
                  iconType: provider.iconType,
                  iconId: provider.iconId,
                  iconUrl: providerIconUrl,
                }
              : null,
            isFavorite: favoriteModelIds.has(model._id),
          }
        }),
    )

    const sortedProviders = await Promise.all(
      providers
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (provider) => ({
          _id: provider._id,
          name: provider.name,
          providerType: provider.providerType,
          icon: provider.icon,
          iconType: provider.iconType,
          iconId: provider.iconId,
          iconUrl: provider.iconId ? await ctx.storage.getUrl(provider.iconId) : undefined,
        })),
    )

    return {
      providers: sortedProviders,
      favorites: modelsWithInfo.filter((model) => model.isFavorite),
      models: modelsWithInfo.sort((left, right) => left.sortOrder - right.sortOrder),
    }
  },
})

export const toggleFavoriteModel = mutation({
  args: { modelId: v.id('models') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to favorite a model',
      })
    }

    const existing = await ctx.db
      .query('userFavoriteModels')
      .withIndex('by_user_model', (q) =>
        q.eq('userId', userId).eq('modelId', args.modelId),
      )
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return { favorited: false }
    }

    await ctx.db.insert('userFavoriteModels', {
      userId,
      modelId: args.modelId,
      createdAt: Date.now(),
    })
    return { favorited: true }
  },
})

export const setFavoriteModel = mutation({
  args: {
    modelId: v.id('models'),
    isFavorite: v.boolean(),
    clientUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to favorite a model',
      })
    }

    const existing = await ctx.db
      .query('userFavoriteModels')
      .withIndex('by_user_model', (q) =>
        q.eq('userId', userId).eq('modelId', args.modelId),
      )
      .first()

    if (args.isFavorite) {
      if (existing) {
        return { favorited: true }
      }

      await ctx.db.insert('userFavoriteModels', {
        userId,
        modelId: args.modelId,
        createdAt: args.clientUpdatedAt ?? Date.now(),
      })
      return { favorited: true }
    }

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    return { favorited: false }
  },
})

export const addProvider = mutation({
  args: {
    name: v.string(),
    providerType: providerTypeValidator,
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    sortOrder: v.number(),
    icon: v.optional(v.string()),
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')),
    rateLimit: v.optional(rateLimitPolicyValidator),
    config: v.optional(providerConfigValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.insert('providers', {
      ...args,
      lastDiscoveredAt: undefined,
      lastDiscoveryError: undefined,
      lastDiscoveredModelCount: undefined,
    })
  },
})

export const updateProvider = mutation({
  args: {
    id: v.id('providers'),
    name: v.optional(v.string()),
    providerType: v.optional(providerTypeValidator),
    apiKey: v.optional(v.string()),
    baseURL: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    icon: v.optional(v.string()),
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')),
    rateLimit: v.optional(rateLimitPolicyValidator),
    config: v.optional(providerConfigValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const { id, ...updates } = args
    await ctx.db.patch(id, cleanUpdates(updates))
  },
})

export const toggleProviderEnabled = mutation({
  args: {
    id: v.id('providers'),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled })
  },
})

export const deleteProvider = mutation({
  args: { id: v.id('providers') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const models = await ctx.db
      .query('models')
      .withIndex('by_providerId', (q) => q.eq('providerId', args.id))
      .collect()

    if (models.length > 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Cannot delete provider with existing models. Remove models first.',
      })
    }

    await ctx.db.delete(args.id)
  },
})

export const addModel = mutation({
  args: {
    modelId: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
    providerId: v.id('providers'),
    icon: v.optional(v.string()),
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')),
    capabilities: v.optional(v.array(v.string())),
    ownedBy: v.optional(v.string()),
    contextWindow: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    modalities: v.optional(modalitiesValidator),
    rateLimit: v.optional(rateLimitPolicyValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await ctx.db.insert('models', args)
  },
})

export const updateModel = mutation({
  args: {
    id: v.id('models'),
    modelId: v.optional(v.string()),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
    isFree: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    providerId: v.optional(v.id('providers')),
    icon: v.optional(v.string()),
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')),
    capabilities: v.optional(v.array(v.string())),
    ownedBy: v.optional(v.string()),
    contextWindow: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    modalities: v.optional(modalitiesValidator),
    rateLimit: v.optional(rateLimitPolicyValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const { id, ...updates } = args
    await ctx.db.patch(id, cleanUpdates(updates))
  },
})

export const toggleModelEnabled = mutation({
  args: {
    id: v.id('models'),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    await ctx.db.patch(args.id, { isEnabled: args.isEnabled })
  },
})

export const deleteModel = mutation({
  args: { id: v.id('models') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    await ctx.db.delete(args.id)
  },
})

export const importDiscoveredModels = mutation({
  args: {
    providerId: v.id('providers'),
    models: v.array(discoveredModelValidator),
    enableImportedModels: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const existingModels = await ctx.db
      .query('models')
      .withIndex('by_providerId', (q) => q.eq('providerId', args.providerId))
      .collect()
    const existingByModelId = new Map(
      existingModels.map((model) => [model.modelId, model]),
    )
    const nextSortOrder =
      existingModels.reduce((max, model) => Math.max(max, model.sortOrder), -1) + 1
    const enableImportedModels = args.enableImportedModels ?? true
    let inserted = 0
    let updated = 0

    for (const [index, discovered] of args.models.entries()) {
      const existing = existingByModelId.get(discovered.modelId)
      const payload = {
        description: discovered.description,
        ownedBy: discovered.ownedBy,
        contextWindow: discovered.contextWindow,
        maxOutputTokens: discovered.maxOutputTokens,
        modalities: discovered.modalities,
        lastSyncedAt: Date.now(),
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...payload,
          displayName: existing.displayName || discovered.displayName,
        })
        updated += 1
        continue
      }

      await ctx.db.insert('models', {
        modelId: discovered.modelId,
        displayName: discovered.displayName,
        description: discovered.description,
        isEnabled: enableImportedModels,
        isFree: normalizeIsFree(discovered.modelId),
        sortOrder: nextSortOrder + index,
        providerId: args.providerId,
        ownedBy: discovered.ownedBy,
        contextWindow: discovered.contextWindow,
        maxOutputTokens: discovered.maxOutputTokens,
        modalities: discovered.modalities,
        discoveredAt: Date.now(),
        lastSyncedAt: Date.now(),
      })
      inserted += 1
    }

    await ctx.db.patch(args.providerId, {
      lastDiscoveredAt: Date.now(),
      lastDiscoveryError: '',
      lastDiscoveredModelCount: args.models.length,
    })

    return { inserted, updated }
  },
})

export const inspectProviderCatalog = action({
  args: {
    providerId: v.optional(v.id('providers')),
    providerType: providerTypeValidator,
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
    config: v.optional(providerConfigValidator),
  },
  handler: async (ctx, args) => {
    const adminContext = await ctx.runQuery(internal.admin.getAdminContext, {})
    if (!adminContext.isAdmin) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Admin access required to inspect provider catalogs',
      })
    }

    const result = await fetchProviderCatalog(args)

    if (args.providerId) {
      await ctx.runMutation(internal.admin.storeProviderDiscoveryState, {
        providerId: args.providerId,
        lastDiscoveredAt: result.fetchedAt,
        lastDiscoveryError: result.error ?? '',
        lastDiscoveredModelCount: result.modelCount,
      })
    }

    return result
  },
})

export const storeProviderDiscoveryState = internalMutation({
  args: {
    providerId: v.id('providers'),
    lastDiscoveredAt: v.number(),
    lastDiscoveryError: v.string(),
    lastDiscoveredModelCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      lastDiscoveredAt: args.lastDiscoveredAt,
      lastDiscoveryError: args.lastDiscoveryError,
      lastDiscoveredModelCount: args.lastDiscoveredModelCount,
    })
  },
})

export const recordModelUsage = internalMutation({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
    providerId: v.id('providers'),
    modelId: v.id('models'),
    providerType: v.string(),
    providerName: v.string(),
    modelName: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('modelUsageEvents', args)
  },
})

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const now = Date.now()
    const since30d = now - 30 * DAY_MS
    const since7d = now - 7 * DAY_MS

    const [providers, models, users, favorites, settings, usageEvents] = await Promise.all([
      ctx.db.query('providers').collect(),
      ctx.db.query('models').collect(),
      ctx.db.query('users').collect(),
      ctx.db.query('userFavoriteModels').collect(),
      getCurrentAdminSettings(ctx),
      ctx.db
        .query('modelUsageEvents')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', since30d))
        .collect(),
    ])

    const usageLast30d = usageEvents
    const usageLast7d = usageEvents.filter((event) => event.createdAt >= since7d)
    const favoritesByModelId = new Map<string, number>()
    for (const favorite of favorites) {
      favoritesByModelId.set(
        favorite.modelId,
        (favoritesByModelId.get(favorite.modelId) ?? 0) + 1,
      )
    }

    const usageByProviderId = new Map<
      string,
      { requests: number; tokens: number; users: Set<string>; lastUsedAt: number }
    >()
    const usageByModelId = new Map<
      string,
      { requests: number; tokens: number; users: Set<string>; lastUsedAt: number }
    >()
    const usageByUserId = new Map<
      string,
      { requests: number; tokens: number; models: Set<string>; lastUsedAt: number }
    >()

    for (const event of usageLast30d) {
      const providerUsage = usageByProviderId.get(event.providerId) ?? {
        requests: 0,
        tokens: 0,
        users: new Set<string>(),
        lastUsedAt: 0,
      }
      providerUsage.requests += 1
      providerUsage.tokens += event.totalTokens
      providerUsage.users.add(event.userId)
      providerUsage.lastUsedAt = Math.max(providerUsage.lastUsedAt, event.createdAt)
      usageByProviderId.set(event.providerId, providerUsage)

      const modelUsage = usageByModelId.get(event.modelId) ?? {
        requests: 0,
        tokens: 0,
        users: new Set<string>(),
        lastUsedAt: 0,
      }
      modelUsage.requests += 1
      modelUsage.tokens += event.totalTokens
      modelUsage.users.add(event.userId)
      modelUsage.lastUsedAt = Math.max(modelUsage.lastUsedAt, event.createdAt)
      usageByModelId.set(event.modelId, modelUsage)

      const userUsage = usageByUserId.get(event.userId) ?? {
        requests: 0,
        tokens: 0,
        models: new Set<string>(),
        lastUsedAt: 0,
      }
      userUsage.requests += 1
      userUsage.tokens += event.totalTokens
      userUsage.models.add(event.modelId)
      userUsage.lastUsedAt = Math.max(userUsage.lastUsedAt, event.createdAt)
      usageByUserId.set(event.userId, userUsage)
    }

    const usageSeries = Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(since7d + index * DAY_MS)
      const label = dayStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      const dayEnd = dayStart.getTime() + DAY_MS
      const dayEvents = usageLast7d.filter(
        (event) => event.createdAt >= dayStart.getTime() && event.createdAt < dayEnd,
      )
      return {
        date: label,
        requests: dayEvents.length,
        tokens: dayEvents.reduce((sum, event) => sum + event.totalTokens, 0),
      }
    })

    const providerRows = await Promise.all(
      providers
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (provider) => {
          const providerModels = models.filter((model) => model.providerId === provider._id)
          const usage = usageByProviderId.get(provider._id)
          return {
            ...provider,
            iconUrl: provider.iconId ? await ctx.storage.getUrl(provider.iconId) : undefined,
            modelCount: providerModels.length,
            enabledModelCount: providerModels.filter((model) => model.isEnabled).length,
            usage: {
              requests: usage?.requests ?? 0,
              tokens: usage?.tokens ?? 0,
              users: usage?.users.size ?? 0,
              lastUsedAt: usage?.lastUsedAt,
            },
          }
        }),
    )

    const providerMap = new Map(providerRows.map((provider) => [provider._id, provider]))

    const modelRows = await Promise.all(
      models
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (model) => {
          const usage = usageByModelId.get(model._id)
          const provider = providerMap.get(model.providerId)
          return {
            ...model,
            iconUrl: model.iconId ? await ctx.storage.getUrl(model.iconId) : undefined,
            providerName: provider?.name ?? 'Unknown Provider',
            providerIconUrl: provider?.iconUrl,
            favorites: favoritesByModelId.get(model._id) ?? 0,
            usage: {
              requests: usage?.requests ?? 0,
              tokens: usage?.tokens ?? 0,
              users: usage?.users.size ?? 0,
              lastUsedAt: usage?.lastUsedAt,
            },
          }
        }),
    )

    const userRows = [...usageByUserId.entries()]
      .map(([userId, usage]) => {
        const user = users.find((candidate) => candidate._id === userId)
        return {
          userId,
          name: user?.name ?? user?.email ?? 'Unknown user',
          email: user?.email,
          requests: usage.requests,
          tokens: usage.tokens,
          models: usage.models.size,
          lastUsedAt: usage.lastUsedAt,
        }
      })
      .sort((left, right) => right.tokens - left.tokens)

    const totalTokens = usageLast30d.reduce((sum, event) => sum + event.totalTokens, 0)

    return {
      settings,
      summary: {
        totalProviders: providers.length,
        enabledProviders: providers.filter((provider) => provider.isEnabled).length,
        totalModels: models.length,
        visibleModels: models.filter((model) => model.isEnabled).length,
        hiddenModels: models.filter((model) => !model.isEnabled).length,
        totalRequests30d: usageLast30d.length,
        totalTokens30d: totalTokens,
        activeUsers30d: usageByUserId.size,
      },
      usageSeries,
      providers: providerRows,
      models: modelRows,
      users: userRows,
    }
  },
})

export const seedModels = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const existing = await ctx.db.query('models').first()
    if (existing) {
      return 'Models already seeded'
    }

    const provider = await ctx.db
      .query('providers')
      .withIndex('by_providerType', (q) => q.eq('providerType', 'openrouter'))
      .first()
    if (!provider) {
      return 'Add provider first'
    }

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
        modelId: 'openai/gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        isEnabled: true,
        isFree: false,
        sortOrder: 2,
      },
      {
        modelId: 'anthropic/claude-3.7-sonnet',
        displayName: 'Claude 3.7 Sonnet',
        isEnabled: true,
        isFree: false,
        sortOrder: 3,
      },
      {
        modelId: 'google/gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        isEnabled: true,
        isFree: false,
        sortOrder: 4,
      },
    ]

    for (const model of defaultModels) {
      await ctx.db.insert('models', {
        ...model,
        providerId: provider._id,
      })
    }

    return 'Models seeded successfully'
  },
})

export const makeAdmin = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const existingAdmin = await ctx.db.query('admins').first()

    if (existingAdmin) {
      await requireAdmin(ctx)
    }

    const existing = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) {
      return 'User is already an admin'
    }

    await ctx.db.insert('admins', { userId: args.userId })
    return 'Admin added successfully'
  },
})
