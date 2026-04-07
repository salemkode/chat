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
import {
  discoveredModelValidator,
  iconTypeValidator,
  modalitiesValidator,
  providerCatalogResultValidator,
  providerConfigValidator,
  providerTypeValidator,
  rateLimitPolicyValidator,
} from './lib/validators'
import type { Id } from './_generated/dataModel'
import {
  appPlanValidator,
  DEFAULT_APP_PLAN,
  isModelAllowedForPlan,
} from './lib/appPlan'
import {
  getAppBillingSubscription,
  isStripeSubscriptionActive,
  resolveEffectiveAppPlan,
} from './lib/billing'

const DAY_MS = 24 * 60 * 60 * 1000

const reasoningLevelValidator = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

const modelReasoningDefaultValidator = v.union(
  v.literal('off'),
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

const userRoleValidator = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('member'),
)

const adminSettingsValidator = v.object({
  _id: v.optional(v.id('adminSettings')),
  key: v.string(),
  appPlan: appPlanValidator,
  defaultRateLimit: v.optional(rateLimitPolicyValidator),
  updatedAt: v.number(),
})

const providerBaseValidator = v.object({
  _id: v.id('providers'),
  _creationTime: v.number(),
  apiKey: v.string(),
  baseURL: v.optional(v.string()),
  description: v.optional(v.string()),
  isEnabled: v.boolean(),
  name: v.string(),
  providerType: providerTypeValidator,
  sortOrder: v.number(),
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconId: v.optional(v.id('_storage')),
  rateLimit: v.optional(rateLimitPolicyValidator),
  lastDiscoveredAt: v.optional(v.number()),
  lastDiscoveryError: v.optional(v.string()),
  lastDiscoveredModelCount: v.optional(v.number()),
  config: v.optional(providerConfigValidator),
})

const providerWithIconUrlValidator = v.object({
  _id: v.id('providers'),
  _creationTime: v.number(),
  apiKey: v.string(),
  baseURL: v.optional(v.string()),
  description: v.optional(v.string()),
  isEnabled: v.boolean(),
  name: v.string(),
  providerType: providerTypeValidator,
  sortOrder: v.number(),
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconId: v.optional(v.id('_storage')),
  rateLimit: v.optional(rateLimitPolicyValidator),
  lastDiscoveredAt: v.optional(v.number()),
  lastDiscoveryError: v.optional(v.string()),
  lastDiscoveredModelCount: v.optional(v.number()),
  config: v.optional(providerConfigValidator),
  iconUrl: v.optional(v.string()),
})

const providerSummaryValidator = v.object({
  _id: v.id('providers'),
  name: v.string(),
  providerType: providerTypeValidator,
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconId: v.optional(v.id('_storage')),
  iconUrl: v.optional(v.string()),
})

const modelBaseValidator = v.object({
  _id: v.id('models'),
  _creationTime: v.number(),
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
  supportsReasoning: v.optional(v.boolean()),
  reasoningLevels: v.optional(v.array(reasoningLevelValidator)),
  defaultReasoningLevel: v.optional(modelReasoningDefaultValidator),
  ownedBy: v.optional(v.string()),
  contextWindow: v.optional(v.number()),
  maxOutputTokens: v.optional(v.number()),
  modalities: v.optional(modalitiesValidator),
  rateLimit: v.optional(rateLimitPolicyValidator),
  discoveredAt: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
})

const modelWithProviderValidator = v.object({
  _id: v.id('models'),
  _creationTime: v.number(),
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
  supportsReasoning: v.optional(v.boolean()),
  reasoningLevels: v.optional(v.array(reasoningLevelValidator)),
  defaultReasoningLevel: v.optional(modelReasoningDefaultValidator),
  ownedBy: v.optional(v.string()),
  contextWindow: v.optional(v.number()),
  maxOutputTokens: v.optional(v.number()),
  modalities: v.optional(modalitiesValidator),
  rateLimit: v.optional(rateLimitPolicyValidator),
  discoveredAt: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
  iconUrl: v.optional(v.string()),
  provider: v.union(v.null(), providerSummaryValidator),
  isFavorite: v.boolean(),
})

const dashboardProviderValidator = v.object({
  _id: v.id('providers'),
  _creationTime: v.number(),
  apiKey: v.string(),
  baseURL: v.optional(v.string()),
  description: v.optional(v.string()),
  isEnabled: v.boolean(),
  name: v.string(),
  providerType: providerTypeValidator,
  sortOrder: v.number(),
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconId: v.optional(v.id('_storage')),
  rateLimit: v.optional(rateLimitPolicyValidator),
  lastDiscoveredAt: v.optional(v.number()),
  lastDiscoveryError: v.optional(v.string()),
  lastDiscoveredModelCount: v.optional(v.number()),
  config: v.optional(providerConfigValidator),
  iconUrl: v.optional(v.string()),
  modelCount: v.number(),
  enabledModelCount: v.number(),
  usage: v.object({
    requests: v.number(),
    tokens: v.number(),
    users: v.number(),
    lastUsedAt: v.optional(v.number()),
  }),
})

const dashboardModelValidator = v.object({
  _id: v.id('models'),
  _creationTime: v.number(),
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
  supportsReasoning: v.optional(v.boolean()),
  reasoningLevels: v.optional(v.array(reasoningLevelValidator)),
  defaultReasoningLevel: v.optional(modelReasoningDefaultValidator),
  ownedBy: v.optional(v.string()),
  contextWindow: v.optional(v.number()),
  maxOutputTokens: v.optional(v.number()),
  modalities: v.optional(modalitiesValidator),
  rateLimit: v.optional(rateLimitPolicyValidator),
  discoveredAt: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
  iconUrl: v.optional(v.string()),
  providerName: v.string(),
  providerIconUrl: v.optional(v.string()),
  favorites: v.number(),
  usage: v.object({
    requests: v.number(),
    tokens: v.number(),
    users: v.number(),
    lastUsedAt: v.optional(v.number()),
  }),
})

const collectionModelSummaryValidator = v.object({
  _id: v.id('models'),
  modelId: v.string(),
  displayName: v.string(),
  providerId: v.id('providers'),
  providerName: v.string(),
  isEnabled: v.boolean(),
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconUrl: v.optional(v.string()),
  providerIconUrl: v.optional(v.string()),
})

const dashboardModelCollectionValidator = v.object({
  _id: v.id('modelCollections'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.number(),
  modelIds: v.array(v.id('models')),
  modelCount: v.number(),
  models: v.array(collectionModelSummaryValidator),
})

const publicModelCollectionValidator = v.object({
  _id: v.id('modelCollections'),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.number(),
  modelIds: v.array(v.id('models')),
  modelCount: v.number(),
})

async function hasAdminAccess(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
) {
  const [roleRecord, legacyAdmin] = await Promise.all([
    ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first(),
    ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first(),
  ])
  const role = roleRecord?.role ?? (legacyAdmin ? 'admin' : 'member')
  return role === 'owner' || role === 'admin'
}

async function getRoleContextForUser(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'> | null,
) {
  if (!userId) {
    return { role: 'member' as const, isAdminLike: false }
  }

  const [roleRecord, legacyAdmin] = await Promise.all([
    ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first(),
    ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first(),
  ])
  const role = roleRecord?.role ?? (legacyAdmin ? 'admin' : 'member')
  return {
    role,
    isAdminLike: role === 'owner' || role === 'admin',
  }
}

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  const isAdminLike = await hasAdminAccess(ctx, userId)
  if (!isAdminLike) {
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
      appPlan: DEFAULT_APP_PLAN,
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

async function normalizeCollectionModelIds(
  ctx: MutationCtx,
  modelIds: Id<'models'>[],
) {
  const uniqueModelIds = [...new Set(modelIds)]
  const models = await Promise.all(
    uniqueModelIds.map((modelId) => ctx.db.get(modelId)),
  )
  const missingModelId = uniqueModelIds.find((_, index) => !models[index])

  if (missingModelId) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `Model ${missingModelId} does not exist.`,
    })
  }

  return uniqueModelIds
}

export const getAdminContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    const roleContext = await getRoleContextForUser(ctx, userId)

    return {
      userId: userId ?? null,
      role: roleContext.role,
      isAdmin: roleContext.isAdminLike,
    }
  },
})

export const getRoleContext = query({
  args: {},
  returns: v.object({
    role: userRoleValidator,
    isAdminLike: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    return await getRoleContextForUser(ctx, userId)
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return ''
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return ''

    return await ctx.storage.generateUploadUrl()
  },
})

export const isAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return false
    }

    const isAdminLike = await hasAdminAccess(ctx, userId)
    return isAdminLike
  },
})

export const getAdminSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId)
      return {
        _id: undefined,
        key: 'global',
        appPlan: DEFAULT_APP_PLAN,
        defaultRateLimit: undefined,
        updatedAt: 0,
      }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike)
      return {
        _id: undefined,
        key: 'global',
        appPlan: DEFAULT_APP_PLAN,
        defaultRateLimit: undefined,
        updatedAt: 0,
      }

    return await getCurrentAdminSettings(ctx)
  },
})

export const updateAdminSettings = mutation({
  args: {
    appPlan: v.optional(appPlanValidator),
    defaultRateLimit: v.optional(rateLimitPolicyValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return null

    const existing = await ctx.db
      .query('adminSettings')
      .withIndex('by_key', (q) => q.eq('key', 'global'))
      .first()

    const patch = {
      key: 'global',
      appPlan: args.appPlan ?? existing?.appPlan ?? DEFAULT_APP_PLAN,
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

export const searchUsersForAdmin = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const isAdminLike = await hasAdminAccess(ctx, userId)
    if (!isAdminLike) return []

    const needle = args.query.trim().toLowerCase()
    if (needle.length < 2) {
      return []
    }

    const limit = Math.max(1, Math.min(25, args.limit ?? 8))
    const since30d = Date.now() - 30 * DAY_MS
    const [users, usageEvents] = await Promise.all([
      ctx.db.query('users').collect(),
      ctx.db
        .query('modelUsageEvents')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', since30d))
        .collect(),
    ])

    const usageByUserId = new Map<
      Id<'users'>,
      {
        requests: number
        tokens: number
        lastUsedAt: number
      }
    >()
    for (const event of usageEvents) {
      const existing = usageByUserId.get(event.userId) ?? {
        requests: 0,
        tokens: 0,
        lastUsedAt: 0,
      }
      existing.requests += 1
      existing.tokens += event.totalTokens
      existing.lastUsedAt = Math.max(existing.lastUsedAt, event.createdAt)
      usageByUserId.set(event.userId, existing)
    }

    return users
      .filter((candidate) => {
        const email = candidate.email?.toLowerCase() ?? ''
        const name = candidate.name?.toLowerCase() ?? ''
        return email.includes(needle) || name.includes(needle)
      })
      .map((candidate) => {
        const usage = usageByUserId.get(candidate._id)
        return {
          userId: candidate._id,
          name: candidate.name ?? candidate.email ?? 'Unknown user',
          email: candidate.email,
          appPlan: candidate.appPlan ?? DEFAULT_APP_PLAN,
          requests: usage?.requests ?? 0,
          tokens: usage?.tokens ?? 0,
          lastUsedAt: usage?.lastUsedAt,
        }
      })
      .sort((left, right) => {
        if (right.tokens !== left.tokens) {
          return right.tokens - left.tokens
        }
        return left.name.localeCompare(right.name)
      })
      .slice(0, limit)
  },
})

export const setUserAppPlan = mutation({
  args: {
    userId: v.id('users'),
    appPlan: appPlanValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const isAdminLike = await hasAdminAccess(ctx, userId)
    if (!isAdminLike) return null

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'User not found',
      })
    }

    await ctx.db.patch(args.userId, {
      appPlan: args.appPlan,
    })

    return {
      userId: args.userId,
      appPlan: args.appPlan,
    }
  },
})

export const listAllProviders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return []

    const providers = await ctx.db.query('providers').collect()
    return await Promise.all(
      providers
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (provider) => ({
          ...provider,
          iconUrl: provider.iconId
            ? ((await ctx.storage.getUrl(provider.iconId)) ?? undefined)
            : undefined,
        })),
    )
  },
})

export const listAllModels = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return []

    const [models, providers] = await Promise.all([
      ctx.db.query('models').collect(),
      ctx.db.query('providers').collect(),
    ])
    const providerMap = new Map(
      providers.map((provider) => [provider._id, provider]),
    )

    return await Promise.all(
      models
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (model) => {
          const provider = providerMap.get(model.providerId)
          return {
            ...model,
            iconUrl: model.iconId
              ? ((await ctx.storage.getUrl(model.iconId)) ?? undefined)
              : undefined,
            providerName: provider?.name ?? 'Unknown Provider',
            provider,
          }
        }),
    )
  },
})

export const listEnabledModels = query({
  args: {},
  returns: v.array(modelBaseValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const [models, providers, settings, user] = await Promise.all([
      ctx.db
        .query('models')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db
        .query('providers')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      getCurrentAdminSettings(ctx),
      ctx.db.get(userId),
    ])
    const effectiveAppPlan = await resolveEffectiveAppPlan(
      ctx,
      settings,
      user ?? undefined,
    )

    const enabledProviderIds = new Set(
      providers.map((provider) => provider._id),
    )

    return models
      .filter(
        (model) =>
          enabledProviderIds.has(model.providerId) &&
          isModelAllowedForPlan(model, { appPlan: effectiveAppPlan }),
      )
      .sort((left, right) => left.sortOrder - right.sortOrder)
  },
})

export const listModelsWithProviders = query({
  args: {},
  returns: v.object({
    collections: v.array(publicModelCollectionValidator),
    providers: v.array(providerSummaryValidator),
    favorites: v.array(modelWithProviderValidator),
    models: v.array(modelWithProviderValidator),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { collections: [], providers: [], favorites: [], models: [] }
    }

    const [models, providers, favorites, settings, user, collections] =
      await Promise.all([
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
        getCurrentAdminSettings(ctx),
        ctx.db.get(userId),
        ctx.db.query('modelCollections').collect(),
      ])
    const effectiveAppPlan = await resolveEffectiveAppPlan(
      ctx,
      settings,
      user ?? undefined,
    )

    const favoriteModelIds = new Set(
      favorites.map((favorite) => favorite.modelId),
    )
    const providerMap = new Map(
      providers.map((provider) => [provider._id, provider]),
    )

    const modelsWithInfo = await Promise.all(
      models
        .filter(
          (model) =>
            providerMap.has(model.providerId) &&
            isModelAllowedForPlan(model, { appPlan: effectiveAppPlan }),
        )
        .map(async (model) => {
          const provider = providerMap.get(model.providerId)
          const providerIconUrl = provider?.iconId
            ? ((await ctx.storage.getUrl(provider.iconId)) ?? undefined)
            : undefined
          const modelIconUrl = model.iconId
            ? ((await ctx.storage.getUrl(model.iconId)) ?? undefined)
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
          iconUrl: provider.iconId
            ? ((await ctx.storage.getUrl(provider.iconId)) ?? undefined)
            : undefined,
        })),
    )

    const visibleModelIds = new Set(modelsWithInfo.map((model) => model._id))
    const collectionRows = collections
      .map((collection) => {
        const modelIds = collection.modelIds.filter((modelId) =>
          visibleModelIds.has(modelId),
        )

        return {
          ...collection,
          modelIds,
          modelCount: modelIds.length,
        }
      })
      .filter((collection) => collection.modelCount > 0)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder
        }
        return left.name.localeCompare(right.name)
      })

    return {
      collections: collectionRows,
      providers: sortedProviders,
      favorites: modelsWithInfo.filter((model) => model.isFavorite),
      models: modelsWithInfo.sort(
        (left, right) => left.sortOrder - right.sortOrder,
      ),
    }
  },
})

export const toggleFavoriteModel = mutation({
  args: { modelId: v.id('models') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { favorited: false }
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
      return { favorited: false }
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
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Not signed in.',
      })
    }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Not authorized to manage providers.',
      })
    }

    const name = args.name.trim()
    const apiKey = args.apiKey.trim()
    if (!name) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Provider name is required.',
      })
    }
    if (!apiKey) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'API key is required.',
      })
    }

    return await ctx.db.insert('providers', {
      ...args,
      name,
      apiKey,
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
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Not signed in.',
      })
    }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Not authorized to manage providers.',
      })
    }

    const { id, ...rawUpdates } = args
    const updates = { ...rawUpdates }
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim()
      if (!trimmed) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'Provider name cannot be empty.',
        })
      }
      updates.name = trimmed
    }
    if (updates.apiKey !== undefined) {
      const trimmed = updates.apiKey.trim()
      if (!trimmed) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'API key cannot be empty.',
        })
      }
      updates.apiKey = trimmed
    }

    await ctx.db.patch(id, cleanUpdates(updates))
    return
  },
})

export const toggleProviderEnabled = mutation({
  args: {
    id: v.id('providers'),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return

    await ctx.db.patch(args.id, { isEnabled: args.isEnabled })
    return
  },
})

export const deleteProvider = mutation({
  args: { id: v.id('providers') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return

    const models = await ctx.db
      .query('models')
      .withIndex('by_providerId', (q) => q.eq('providerId', args.id))
      .collect()

    if (models.length > 0) {
      return
    }

    await ctx.db.delete(args.id)
    return
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
    supportsReasoning: v.optional(v.boolean()),
    reasoningLevels: v.optional(v.array(reasoningLevelValidator)),
    defaultReasoningLevel: v.optional(modelReasoningDefaultValidator),
    ownedBy: v.optional(v.string()),
    contextWindow: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    modalities: v.optional(modalitiesValidator),
    rateLimit: v.optional(rateLimitPolicyValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Not signed in.',
      })
    }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Not authorized to manage models.',
      })
    }

    const modelId = args.modelId.trim()
    const displayName = args.displayName.trim()
    if (!modelId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Model ID is required.',
      })
    }
    if (!displayName) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Display name is required.',
      })
    }

    return await ctx.db.insert('models', {
      ...args,
      modelId,
      displayName,
    })
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
    supportsReasoning: v.optional(v.boolean()),
    reasoningLevels: v.optional(v.array(reasoningLevelValidator)),
    defaultReasoningLevel: v.optional(modelReasoningDefaultValidator),
    ownedBy: v.optional(v.string()),
    contextWindow: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    modalities: v.optional(modalitiesValidator),
    rateLimit: v.optional(rateLimitPolicyValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Not signed in.',
      })
    }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Not authorized to manage models.',
      })
    }

    const { id, ...rawUpdates } = args
    const updates = { ...rawUpdates }
    if (updates.modelId !== undefined) {
      const trimmed = updates.modelId.trim()
      if (!trimmed) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'Model ID cannot be empty.',
        })
      }
      updates.modelId = trimmed
    }
    if (updates.displayName !== undefined) {
      const trimmed = updates.displayName.trim()
      if (!trimmed) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'Display name cannot be empty.',
        })
      }
      updates.displayName = trimmed
    }

    await ctx.db.patch(id, cleanUpdates(updates))
    return
  },
})

export const toggleModelEnabled = mutation({
  args: {
    id: v.id('models'),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return

    await ctx.db.patch(args.id, { isEnabled: args.isEnabled })
    return
  },
})

export const deleteModel = mutation({
  args: { id: v.id('models') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return

    const [collections, favorites] = await Promise.all([
      ctx.db.query('modelCollections').collect(),
      ctx.db.query('userFavoriteModels').collect(),
    ])

    await Promise.all([
      ...collections
        .filter((collection) => collection.modelIds.includes(args.id))
        .map((collection) =>
          ctx.db.patch(collection._id, {
            modelIds: collection.modelIds.filter(
              (modelId) => modelId !== args.id,
            ),
          }),
        ),
      ...favorites
        .filter((favorite) => favorite.modelId === args.id)
        .map((favorite) => ctx.db.delete(favorite._id)),
    ])

    await ctx.db.delete(args.id)
    return
  },
})

export const addModelCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    modelIds: v.array(v.id('models')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return null

    const modelIds = await normalizeCollectionModelIds(ctx, args.modelIds)

    return await ctx.db.insert('modelCollections', {
      ...args,
      modelIds,
    })
  },
})

export const updateModelCollection = mutation({
  args: {
    id: v.id('modelCollections'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    modelIds: v.optional(v.array(v.id('models'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return

    const { id, modelIds, ...updates } = args
    await ctx.db.patch(id, {
      ...cleanUpdates(updates),
      ...(modelIds !== undefined
        ? { modelIds: await normalizeCollectionModelIds(ctx, modelIds) }
        : {}),
    })
    return
  },
})

export const deleteModelCollection = mutation({
  args: { id: v.id('modelCollections') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return

    await ctx.db.delete(args.id)
    return
  },
})

export const importDiscoveredModels = mutation({
  args: {
    providerId: v.id('providers'),
    models: v.array(discoveredModelValidator),
    enableImportedModels: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { inserted: 0, updated: 0 }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return { inserted: 0, updated: 0 }

    const existingModels = await ctx.db
      .query('models')
      .withIndex('by_providerId', (q) => q.eq('providerId', args.providerId))
      .collect()
    const existingByModelId = new Map(
      existingModels.map((model) => [model.modelId, model]),
    )
    const nextSortOrder =
      existingModels.reduce(
        (max, model) => Math.max(max, model.sortOrder),
        -1,
      ) + 1
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
      return {
        providerType: args.providerType,
        fetchedAt: 0,
        modelCount: 0,
        error: 'Admin access required',
        models: [],
      }
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
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        settings: {
          _id: undefined,
          key: 'global',
          appPlan: DEFAULT_APP_PLAN,
          defaultRateLimit: undefined,
          updatedAt: 0,
        },
        billing: {
          effectiveAppPlan: DEFAULT_APP_PLAN,
          hasActiveSubscription: false,
          priceConfigured: Boolean(process.env.STRIPE_PRO_PRICE_ID),
          status: undefined,
          priceId: undefined,
          stripeSubscriptionId: undefined,
          currentPeriodEnd: undefined,
          cancelAtPeriodEnd: false,
        },
        summary: {
          totalProviders: 0,
          enabledProviders: 0,
          totalModels: 0,
          visibleModels: 0,
          hiddenModels: 0,
          totalRequests30d: 0,
          totalTokens30d: 0,
          activeUsers30d: 0,
        },
        usageSeries: [],
        providers: [],
        models: [],
        collections: [],
        users: [],
      }
    }
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) {
      return {
        settings: {
          _id: undefined,
          key: 'global',
          appPlan: DEFAULT_APP_PLAN,
          defaultRateLimit: undefined,
          updatedAt: 0,
        },
        billing: {
          effectiveAppPlan: DEFAULT_APP_PLAN,
          hasActiveSubscription: false,
          priceConfigured: Boolean(process.env.STRIPE_PRO_PRICE_ID),
          status: undefined,
          priceId: undefined,
          stripeSubscriptionId: undefined,
          currentPeriodEnd: undefined,
          cancelAtPeriodEnd: false,
        },
        summary: {
          totalProviders: 0,
          enabledProviders: 0,
          totalModels: 0,
          visibleModels: 0,
          hiddenModels: 0,
          totalRequests30d: 0,
          totalTokens30d: 0,
          activeUsers30d: 0,
        },
        usageSeries: [],
        providers: [],
        models: [],
        collections: [],
        users: [],
      }
    }

    const now = Date.now()
    const since30d = now - 30 * DAY_MS
    const since7d = now - 7 * DAY_MS

    const [
      providers,
      models,
      collections,
      users,
      favorites,
      settings,
      usageEvents,
      billingSubscription,
    ] = await Promise.all([
      ctx.db.query('providers').collect(),
      ctx.db.query('models').collect(),
      ctx.db.query('modelCollections').collect(),
      ctx.db.query('users').collect(),
      ctx.db.query('userFavoriteModels').collect(),
      getCurrentAdminSettings(ctx),
      ctx.db
        .query('modelUsageEvents')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', since30d))
        .collect(),
      getAppBillingSubscription(ctx),
    ])
    const hasActiveSubscription =
      isStripeSubscriptionActive(billingSubscription)
    const effectiveAppPlan = hasActiveSubscription ? 'pro' : settings.appPlan

    const usageLast30d = usageEvents
    const usageLast7d = usageEvents.filter(
      (event) => event.createdAt >= since7d,
    )
    const favoritesByModelId = new Map<string, number>()
    for (const favorite of favorites) {
      favoritesByModelId.set(
        favorite.modelId,
        (favoritesByModelId.get(favorite.modelId) ?? 0) + 1,
      )
    }

    const usageByProviderId = new Map<
      Id<'providers'>,
      {
        requests: number
        tokens: number
        users: Set<string>
        lastUsedAt: number
      }
    >()
    const usageByModelId = new Map<
      Id<'models'>,
      {
        requests: number
        tokens: number
        users: Set<string>
        lastUsedAt: number
      }
    >()
    const usageByUserId = new Map<
      Id<'users'>,
      {
        requests: number
        tokens: number
        models: Set<string>
        lastUsedAt: number
      }
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
      providerUsage.lastUsedAt = Math.max(
        providerUsage.lastUsedAt,
        event.createdAt,
      )
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
        (event) =>
          event.createdAt >= dayStart.getTime() && event.createdAt < dayEnd,
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
          const providerModels = models.filter(
            (model) => model.providerId === provider._id,
          )
          const usage = usageByProviderId.get(provider._id)
          return {
            ...provider,
            iconUrl: provider.iconId
              ? ((await ctx.storage.getUrl(provider.iconId)) ?? undefined)
              : undefined,
            modelCount: providerModels.length,
            enabledModelCount: providerModels.filter((model) => model.isEnabled)
              .length,
            usage: {
              requests: usage?.requests ?? 0,
              tokens: usage?.tokens ?? 0,
              users: usage?.users.size ?? 0,
              lastUsedAt: usage?.lastUsedAt,
            },
          }
        }),
    )

    const providerMap = new Map(
      providerRows.map((provider) => [provider._id, provider]),
    )

    const modelRows = await Promise.all(
      models
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (model) => {
          const usage = usageByModelId.get(model._id)
          const provider = providerMap.get(model.providerId)
          return {
            ...model,
            iconUrl: model.iconId
              ? ((await ctx.storage.getUrl(model.iconId)) ?? undefined)
              : undefined,
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

    const modelRowMap = new Map(modelRows.map((model) => [model._id, model]))

    const collectionRows = collections
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((collection) => {
        const collectionModels = collection.modelIds
          .map((modelId) => modelRowMap.get(modelId))
          .filter((model): model is (typeof modelRows)[number] =>
            Boolean(model),
          )
          .map((model) => ({
            _id: model._id,
            modelId: model.modelId,
            displayName: model.displayName,
            providerId: model.providerId,
            providerName: model.providerName,
            isEnabled: model.isEnabled,
            icon: model.icon,
            iconType: model.iconType,
            iconUrl: model.iconUrl,
            providerIconUrl: model.providerIconUrl,
          }))

        return {
          ...collection,
          modelCount: collectionModels.length,
          models: collectionModels,
        }
      })

    const userRows = [...usageByUserId.entries()]
      .map(([userId, usage]) => {
        const user = users.find((candidate) => candidate._id === userId)
        return {
          userId,
          name: user?.name ?? user?.email ?? 'Unknown user',
          email: user?.email,
          appPlan: user?.appPlan ?? DEFAULT_APP_PLAN,
          requests: usage.requests,
          tokens: usage.tokens,
          models: usage.models.size,
          lastUsedAt: usage.lastUsedAt,
        }
      })
      .sort((left, right) => right.tokens - left.tokens)

    const totalTokens = usageLast30d.reduce(
      (sum, event) => sum + event.totalTokens,
      0,
    )

    return {
      settings,
      billing: {
        effectiveAppPlan,
        hasActiveSubscription,
        priceConfigured: Boolean(process.env.STRIPE_PRO_PRICE_ID),
        status: billingSubscription?.status,
        priceId: billingSubscription?.priceId,
        stripeSubscriptionId: billingSubscription?.stripeSubscriptionId,
        currentPeriodEnd: billingSubscription?.currentPeriodEnd
          ? billingSubscription.currentPeriodEnd < 1_000_000_000_000
            ? billingSubscription.currentPeriodEnd * 1000
            : billingSubscription.currentPeriodEnd
          : undefined,
        cancelAtPeriodEnd: billingSubscription?.cancelAtPeriodEnd ?? false,
      },
      summary: {
        totalProviders: providers.length,
        enabledProviders: providers.filter((provider) => provider.isEnabled)
          .length,
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
      collections: collectionRows,
      users: userRows,
    }
  },
})

export const seedModels = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return ''
    const isAdminLike = await hasAdminAccess(ctx, userId)

    if (!isAdminLike) return ''

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
      const userId = await getAuthUserId(ctx)
      if (!userId) return ''
      const isAdminLike = await hasAdminAccess(ctx, userId)

      if (!isAdminLike) return ''
    }

    const existing = await ctx.db
      .query('admins')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) {
      return 'User is already an admin'
    }

    await ctx.db.insert('admins', { userId: args.userId })
    const existingRole = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()
    if (existingRole) {
      await ctx.db.patch(existingRole._id, {
        role: 'admin',
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('userRoles', {
        userId: args.userId,
        role: 'admin',
        updatedAt: Date.now(),
      })
    }
    return 'Admin added successfully'
  },
})

export const setUserRole = mutation({
  args: {
    userId: v.id('users'),
    role: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const actorId = await requireAdmin(ctx)
    const existing = await ctx.db
      .query('userRoles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        grantedBy: actorId,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert('userRoles', {
      userId: args.userId,
      role: args.role,
      grantedBy: actorId,
      updatedAt: Date.now(),
    })
  },
})
