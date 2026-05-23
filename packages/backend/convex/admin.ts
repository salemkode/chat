import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { paginationOptsValidator } from 'convex/server'
import { api, internal } from './_generated/api'
import { ConvexError, v } from 'convex/values'
import { generateObject } from 'ai'
import { getAuthUserId } from './lib/auth'
import { fetchProviderCatalog } from './lib/providerCatalog'
import {
  discoveredModelValidator,
  iconTypeValidator,
  modelAttachmentValidationStatusValidator,
  modalitiesValidator,
  providerConfigValidator,
  providerTypeValidator,
  rateLimitPolicyValidator,
} from './lib/validators'
import type { Id } from './_generated/dataModel'
import { appPlanValidator, DEFAULT_APP_PLAN, isModelUsableForPlan } from './lib/appPlan'
import { getModelOfferAccessFlags } from './lib/modelOffersAccess'
import {
  getAppBillingSubscription,
  isStripeSubscriptionActive,
  resolveEffectiveAppPlan,
} from './lib/billing'
import { estimateCostFromProfile } from './lib/pricingTier'
import { createLanguageModelFromAuxiliary } from './lib/createLanguageModel'
import {
  isValidAttachmentMediaTypePattern,
  normalizeAttachmentMediaTypes,
  resolveModelAttachmentMediaTypes,
} from './lib/modelAttachmentPolicy'
import { paginateResults } from './lib/pagination'
import { z } from 'zod'

const DAY_MS = 24 * 60 * 60 * 1000

const reasoningLevelValidator = v.union(v.literal('low'), v.literal('medium'), v.literal('high'))

const modelReasoningDefaultValidator = v.union(
  v.literal('off'),
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

const userRoleValidator = v.union(v.literal('owner'), v.literal('admin'), v.literal('member'))

const autoModelRouterPreferenceValidator = v.union(
  v.literal('balanced'),
  v.literal('cost'),
  v.literal('speed'),
  v.literal('quality'),
)

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
  supportedAttachmentMediaTypes: v.optional(v.array(v.string())),
  attachmentValidationStatus: v.optional(modelAttachmentValidationStatusValidator),
  attachmentValidationMessage: v.optional(v.string()),
  attachmentValidatedAt: v.optional(v.number()),
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
  supportedAttachmentMediaTypes: v.optional(v.array(v.string())),
  attachmentValidationStatus: v.optional(modelAttachmentValidationStatusValidator),
  attachmentValidationMessage: v.optional(v.string()),
  attachmentValidatedAt: v.optional(v.number()),
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
  supportedAttachmentMediaTypes: v.optional(v.array(v.string())),
  attachmentValidationStatus: v.optional(modelAttachmentValidationStatusValidator),
  attachmentValidationMessage: v.optional(v.string()),
  attachmentValidatedAt: v.optional(v.number()),
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
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconId: v.optional(v.id('_storage')),
  iconUrl: v.optional(v.string()),
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
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  iconId: v.optional(v.id('_storage')),
  iconUrl: v.optional(v.string()),
  sortOrder: v.number(),
  modelIds: v.array(v.id('models')),
  modelCount: v.number(),
})

const modelOfferKindValidator = v.union(v.literal('free_access'), v.literal('availability_window'))

const modelOfferRowValidator = v.object({
  _id: v.id('modelOffers'),
  _creationTime: v.number(),
  modelId: v.id('models'),
  kind: modelOfferKindValidator,
  startsAt: v.number(),
  endsAt: v.number(),
  label: v.optional(v.string()),
  description: v.optional(v.string()),
  isEnabled: v.boolean(),
  updatedAt: v.number(),
})

const adminAccountRowValidator = v.object({
  userId: v.id('users'),
  name: v.string(),
  email: v.optional(v.string()),
  appPlan: appPlanValidator,
  requests30d: v.number(),
  tokens30d: v.number(),
  models30d: v.number(),
  lastUsedAt: v.optional(v.number()),
})

const routerStudioCategoryValidator = v.union(
  v.literal('Best default'),
  v.literal('Coding'),
  v.literal('Vision'),
  v.literal('Long context'),
  v.literal('Fast'),
  v.literal('Budget'),
  v.literal('Reasoning'),
  v.literal('Needs metadata'),
)

const routerStudioModelValidator = v.object({
  modelId: v.string(),
  autoScore: v.number(),
  category: routerStudioCategoryValidator,
  qualityScore: v.number(),
  speedScore: v.number(),
  costScore: v.number(),
  contextScore: v.number(),
  routingTags: v.array(v.string()),
  reasons: v.array(v.string()),
})

const COLLECTION_AI_ICON_OPTIONS = [
  'Sparkles',
  'Brain',
  'Code2',
  'Rocket',
  'ChartColumn',
  'Camera',
  'Globe',
  'Shield',
  'Gem',
  'WandSparkles',
  'Clock',
  'Bot',
  'Database',
  'Search',
] as const

const collectionSuggestionSchema = z.object({
  collections: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        description: z.string().max(220).optional(),
        iconType: z.enum(['emoji', 'phosphor']).optional(),
        icon: z.string().min(1).max(40).optional(),
        modelIds: z.array(z.string()).min(1),
      }),
    )
    .min(1)
    .max(8),
})

function isCollectionAiIconOption(
  value: string | undefined,
): value is (typeof COLLECTION_AI_ICON_OPTIONS)[number] {
  return value !== undefined && COLLECTION_AI_ICON_OPTIONS.some((option) => option === value)
}

function normalizeSuggestedCollectionIcon(
  iconType: 'emoji' | 'phosphor' | undefined,
  icon: string | undefined,
): { iconType: 'emoji' | 'phosphor'; icon: string } {
  if (iconType === 'emoji') {
    const trimmed = icon?.trim()
    return trimmed ? { iconType: 'emoji', icon: trimmed } : { iconType: 'emoji', icon: '✨' }
  }

  const normalizedIcon = isCollectionAiIconOption(icon) ? icon : 'Sparkles'

  return {
    iconType: 'phosphor',
    icon: normalizedIcon,
  }
}

async function hasAdminAccess(ctx: MutationCtx | QueryCtx, userId: Id<'users'>) {
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

async function getRoleContextForUser(ctx: MutationCtx | QueryCtx, userId: Id<'users'> | null) {
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
      autoModelRoutingEnabled: false,
      autoModelRouterUrl: undefined,
      autoModelRouterApiKey: undefined,
      autoModelRouterPreference: 'balanced',
      defaultAuxiliaryModelId: undefined,
      updatedAt: 0,
    }
  )
}

function isAutoModelRoutingAvailable(settings: {
  autoModelRoutingEnabled?: boolean
  autoModelRouterUrl?: string
  autoModelRouterApiKey?: string
}) {
  return (
    settings.autoModelRoutingEnabled === true &&
    Boolean(settings.autoModelRouterUrl?.trim()) &&
    Boolean(settings.autoModelRouterApiKey?.trim())
  )
}

function normalizeRouterBaseUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url
  } catch {
    return null
  }
}

function withPath(baseUrl: URL, path: string) {
  const next = new URL(baseUrl.toString())
  next.pathname = path
  next.search = ''
  next.hash = ''
  return next.toString()
}

function cleanUpdates<T extends Record<string, unknown>>(updates: T) {
  return Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined))
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function normalizeTaskScores(
  benchmarkScores: Record<string, number> | undefined,
  fallbackIntelligence: number,
) {
  return {
    general: clamp01(
      benchmarkScores?.chat ??
        benchmarkScores?.qa ??
        benchmarkScores?.analysis ??
        fallbackIntelligence,
    ),
    code: clamp01(benchmarkScores?.coding ?? benchmarkScores?.analysis ?? fallbackIntelligence),
    math: clamp01(benchmarkScores?.analysis ?? benchmarkScores?.qa ?? fallbackIntelligence),
    analysis: clamp01(benchmarkScores?.analysis ?? benchmarkScores?.chat ?? fallbackIntelligence),
  }
}

function normalizeIsFree(modelId: string) {
  return modelId.includes(':free') || modelId.endsWith('-free')
}

function resolveAttachmentValidationSnapshot(args: {
  capabilities?: string[] | null
  supportedAttachmentMediaTypes?: string[] | null
}) {
  const rawCustomPatterns = Array.isArray(args.supportedAttachmentMediaTypes)
    ? args.supportedAttachmentMediaTypes
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0)
    : []
  const invalidPatterns = [
    ...new Set(rawCustomPatterns.filter((value) => !isValidAttachmentMediaTypePattern(value))),
  ]
  const allowedMediaTypes = resolveModelAttachmentMediaTypes({
    capabilities: args.capabilities,
    supportedAttachmentMediaTypes: args.supportedAttachmentMediaTypes,
  })

  if (invalidPatterns.length > 0) {
    return {
      supportedAttachmentMediaTypes: normalizeAttachmentMediaTypes(
        args.supportedAttachmentMediaTypes,
      ),
      attachmentValidationStatus: 'invalid' as const,
      attachmentValidationMessage: `Invalid media type patterns: ${invalidPatterns.join(', ')}`,
      attachmentValidatedAt: Date.now(),
    }
  }

  const statusMessage =
    allowedMediaTypes.length > 0
      ? `Allowed file types: ${allowedMediaTypes.join(', ')}`
      : 'Attachments are disabled for this model.'

  return {
    supportedAttachmentMediaTypes: normalizeAttachmentMediaTypes(
      args.supportedAttachmentMediaTypes,
    ),
    attachmentValidationStatus: 'valid' as const,
    attachmentValidationMessage: statusMessage,
    attachmentValidatedAt: Date.now(),
  }
}

async function normalizeCollectionModelIds(ctx: MutationCtx, modelIds: Id<'models'>[]) {
  const uniqueModelIds = [...new Set(modelIds)]
  const models = await Promise.all(uniqueModelIds.map((modelId) => ctx.db.get(modelId)))
  const missingModelId = uniqueModelIds.find((_, index) => !models[index])

  if (missingModelId) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `Model ${missingModelId} does not exist.`,
    })
  }

  return uniqueModelIds
}

async function listAdminProvidersInternal(ctx: QueryCtx) {
  const providers = await ctx.db.query('providers').collect()
  const models = await ctx.db.query('models').collect()
  const since30d = Date.now() - 30 * DAY_MS
  const usageEvents = await ctx.db
    .query('modelUsageEvents')
    .withIndex('by_createdAt', (q) => q.gte('createdAt', since30d))
    .collect()

  const modelCountByProvider = new Map<Id<'providers'>, { total: number; enabled: number }>()
  for (const model of models) {
    const counts = modelCountByProvider.get(model.providerId) ?? { total: 0, enabled: 0 }
    counts.total += 1
    if (model.isEnabled) {
      counts.enabled += 1
    }
    modelCountByProvider.set(model.providerId, counts)
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
  for (const event of usageEvents) {
    const usage = usageByProviderId.get(event.providerId) ?? {
      requests: 0,
      tokens: 0,
      users: new Set<string>(),
      lastUsedAt: 0,
    }
    usage.requests += 1
    usage.tokens += event.totalTokens
    usage.users.add(event.userId)
    usage.lastUsedAt = Math.max(usage.lastUsedAt, event.createdAt)
    usageByProviderId.set(event.providerId, usage)
  }

  return await Promise.all(
    providers
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(async (provider) => {
        const counts = modelCountByProvider.get(provider._id) ?? { total: 0, enabled: 0 }
        const usage = usageByProviderId.get(provider._id)
        return {
          ...provider,
          iconUrl: provider.iconId ? ((await ctx.storage.getUrl(provider.iconId)) ?? undefined) : undefined,
          modelCount: counts.total,
          enabledModelCount: counts.enabled,
          usage: {
            requests: usage?.requests ?? 0,
            tokens: usage?.tokens ?? 0,
            users: usage?.users.size ?? 0,
            lastUsedAt: usage?.lastUsedAt,
          },
        }
      }),
  )
}

async function listBrowserModelsInternal(ctx: QueryCtx, userId: Id<'users'>) {
  const [models, providers, favorites, settings, user, collections] = await Promise.all([
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
  const effectiveAppPlan = await resolveEffectiveAppPlan(ctx, settings, user ?? undefined)
  const nowMs = Date.now()
  const modelOffers = await ctx.db.query('modelOffers').collect()
  const favoriteModelIds = new Set(favorites.map((favorite) => favorite.modelId))
  const providerMap = new Map(providers.map((provider) => [provider._id, provider]))

  const modelsWithInfo = await Promise.all(
    models
      .filter((model) => {
        if (!providerMap.has(model.providerId)) {
          return false
        }
        const flags = getModelOfferAccessFlags(model._id, modelOffers, nowMs)
        if (flags.blocksAllAccess) {
          return false
        }
        return isModelUsableForPlan({
          model,
          effectiveAppPlan,
          hasActiveFreeAccessOffer: flags.grantsFreeAccess,
        })
      })
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

  const sortedModels = modelsWithInfo.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }
    return left.displayName.localeCompare(right.displayName)
  })

  const visibleModelIds = new Set(sortedModels.map((model) => model._id))
  const collectionRows = (
    await Promise.all(
      collections.map(async (collection) => {
        const modelIds = collection.modelIds.filter((modelId) => visibleModelIds.has(modelId))
        return {
          ...collection,
          iconUrl: collection.iconId
            ? ((await ctx.storage.getUrl(collection.iconId)) ?? undefined)
            : undefined,
          modelIds,
          modelCount: modelIds.length,
        }
      }),
    )
  )
    .filter((collection) => collection.modelCount > 0)
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.name.localeCompare(right.name)
    })

  return {
    autoModelAvailable: isAutoModelRoutingAvailable(settings),
    collections: collectionRows,
    models: sortedModels,
  }
}

async function listAdminModelsInternal(ctx: QueryCtx) {
  const providers = await listAdminProvidersInternal(ctx)
  const providerMap = new Map(providers.map((provider) => [provider._id, provider]))
  const models = await ctx.db.query('models').collect()
  const favoriteCounts = await ctx.db.query('userFavoriteModels').collect()
  const favoriteCountByModelId = new Map<Id<'models'>, number>()
  for (const favorite of favoriteCounts) {
    favoriteCountByModelId.set(
      favorite.modelId,
      (favoriteCountByModelId.get(favorite.modelId) ?? 0) + 1,
    )
  }
  const since30d = Date.now() - 30 * DAY_MS
  const usageEvents = await ctx.db
    .query('modelUsageEvents')
    .withIndex('by_createdAt', (q) => q.gte('createdAt', since30d))
    .collect()
  const usageByModelId = new Map<
    Id<'models'>,
    {
      requests: number
      tokens: number
      users: Set<string>
      lastUsedAt: number
    }
  >()
  for (const event of usageEvents) {
    const usage = usageByModelId.get(event.modelId) ?? {
      requests: 0,
      tokens: 0,
      users: new Set<string>(),
      lastUsedAt: 0,
    }
    usage.requests += 1
    usage.tokens += event.totalTokens
    usage.users.add(event.userId)
    usage.lastUsedAt = Math.max(usage.lastUsedAt, event.createdAt)
    usageByModelId.set(event.modelId, usage)
  }

  return await Promise.all(
    models
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map(async (model) => {
        const provider = providerMap.get(model.providerId)
        const usage = usageByModelId.get(model._id)
        return {
          ...model,
          iconUrl: model.iconId ? ((await ctx.storage.getUrl(model.iconId)) ?? undefined) : undefined,
          providerName: provider?.name ?? 'Unknown Provider',
          providerIconUrl: provider?.iconUrl,
          favorites: favoriteCountByModelId.get(model._id) ?? 0,
          usage: {
            requests: usage?.requests ?? 0,
            tokens: usage?.tokens ?? 0,
            users: usage?.users.size ?? 0,
            lastUsedAt: usage?.lastUsedAt,
          },
        }
      }),
  )
}

async function listAdminCollectionsInternal(ctx: QueryCtx) {
  const models = await listAdminModelsInternal(ctx)
  const modelById = new Map(models.map((model) => [model._id, model]))
  const collections = await ctx.db.query('modelCollections').collect()

  return await Promise.all(
    collections
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder
        }
        return left.name.localeCompare(right.name)
      })
      .map(async (collection) => {
        const collectionModels = collection.modelIds
          .map((modelId) => modelById.get(modelId))
          .filter((model): model is NonNullable<typeof model> => model !== undefined)
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
          iconUrl: collection.iconId
            ? ((await ctx.storage.getUrl(collection.iconId)) ?? undefined)
            : undefined,
          modelCount: collectionModels.length,
          models: collectionModels,
        }
      }),
  )
}

const collectionSuggestionContextValidator = v.object({
  existingCollectionNames: v.array(v.string()),
  models: v.array(
    v.object({
      _id: v.id('models'),
      modelId: v.string(),
      displayName: v.string(),
      description: v.optional(v.string()),
      providerName: v.string(),
      isEnabled: v.boolean(),
      isFree: v.boolean(),
      capabilities: v.optional(v.array(v.string())),
      supportsReasoning: v.optional(v.boolean()),
      supportedAttachmentMediaTypes: v.optional(v.array(v.string())),
    }),
  ),
})

export const getCollectionSuggestionContext = internalQuery({
  args: {
    includeHiddenModels: v.boolean(),
  },
  returns: collectionSuggestionContextValidator,
  handler: async (ctx, args) => {
    const [models, providers, collections] = await Promise.all([
      ctx.db.query('models').collect(),
      ctx.db.query('providers').collect(),
      ctx.db.query('modelCollections').collect(),
    ])

    const providerById = new Map(providers.map((provider) => [provider._id, provider.name]))

    return {
      existingCollectionNames: collections.map((collection) => collection.name),
      models: models
        .filter((model) => args.includeHiddenModels || model.isEnabled)
        .filter((model) => providerById.has(model.providerId))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((model) => ({
          _id: model._id,
          modelId: model.modelId,
          displayName: model.displayName,
          description: model.description,
          providerName: providerById.get(model.providerId) ?? 'Unknown provider',
          isEnabled: model.isEnabled,
          isFree: model.isFree,
          capabilities: model.capabilities,
          supportsReasoning: model.supportsReasoning,
          supportedAttachmentMediaTypes: model.supportedAttachmentMediaTypes,
        })),
    }
  },
})

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
        autoModelRoutingEnabled: false,
        autoModelRouterUrl: undefined,
        autoModelRouterApiKey: undefined,
        autoModelRouterPreference: 'balanced',
        updatedAt: 0,
      }

    return await getCurrentAdminSettings(ctx)
  },
})

export const updateAdminSettings = mutation({
  args: {
    appPlan: v.optional(appPlanValidator),
    defaultRateLimit: v.optional(rateLimitPolicyValidator),
    autoModelRoutingEnabled: v.optional(v.boolean()),
    autoModelRouterUrl: v.optional(v.string()),
    autoModelRouterApiKey: v.optional(v.string()),
    autoModelRouterPreference: v.optional(autoModelRouterPreferenceValidator),
    defaultAuxiliaryModelId: v.optional(v.id('models')),
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

    const nextRouterUrl =
      (args.autoModelRouterUrl ?? existing?.autoModelRouterUrl)?.trim() || undefined
    const nextRouterApiKey =
      (args.autoModelRouterApiKey ?? existing?.autoModelRouterApiKey)?.trim() || undefined
    const autoEnableFromRouterUrlInput =
      typeof args.autoModelRouterUrl === 'string' && args.autoModelRouterUrl.trim().length > 0

    const patch = {
      key: 'global',
      appPlan: args.appPlan ?? existing?.appPlan ?? DEFAULT_APP_PLAN,
      defaultRateLimit: args.defaultRateLimit,
      autoModelRoutingEnabled: autoEnableFromRouterUrlInput
        ? true
        : (args.autoModelRoutingEnabled ?? existing?.autoModelRoutingEnabled),
      autoModelRouterUrl: nextRouterUrl,
      autoModelRouterApiKey: nextRouterApiKey,
      autoModelRouterPreference:
        args.autoModelRouterPreference ?? existing?.autoModelRouterPreference ?? 'balanced',
      defaultAuxiliaryModelId:
        args.defaultAuxiliaryModelId ?? existing?.defaultAuxiliaryModelId,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert('adminSettings', patch)
  },
})

export const verifyAutoModelRouterConnection = action({
  args: {
    routerUrl: v.optional(v.string()),
    routerApiKey: v.optional(v.string()),
  },
  returns: v.object({
    ok: v.boolean(),
    message: v.string(),
    reachable: v.boolean(),
    authenticated: v.boolean(),
    contractMatched: v.boolean(),
    expectedContract: v.string(),
    healthStatus: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const expectedContract = 'auto-model-router-v1'
    const adminContext = await ctx.runQuery(internal.admin.getAdminContext, {})
    if (!adminContext.isAdmin) {
      return {
        ok: false,
        message: 'Admin access required',
        reachable: false,
        authenticated: false,
        contractMatched: false,
        expectedContract,
        healthStatus: undefined,
      }
    }

    const settings = await ctx.runQuery(api.admin.getAdminSettings, {})
    const routerUrl = (args.routerUrl ?? settings.autoModelRouterUrl ?? '').trim()
    const routerApiKey = (args.routerApiKey ?? settings.autoModelRouterApiKey ?? '').trim()

    if (!routerUrl) {
      return {
        ok: false,
        message: 'Router URL is required',
        reachable: false,
        authenticated: false,
        contractMatched: false,
        expectedContract,
        healthStatus: undefined,
      }
    }

    if (!routerApiKey) {
      return {
        ok: false,
        message: 'Router API key is required',
        reachable: false,
        authenticated: false,
        contractMatched: false,
        expectedContract,
        healthStatus: undefined,
      }
    }

    const routerBaseUrl = normalizeRouterBaseUrl(routerUrl)
    if (!routerBaseUrl) {
      return {
        ok: false,
        message: 'Router URL must be a valid http(s) URL',
        reachable: false,
        authenticated: false,
        contractMatched: false,
        expectedContract,
        healthStatus: undefined,
      }
    }

    const healthUrl = withPath(routerBaseUrl, '/healthz')
    const capabilitiesUrl = withPath(routerBaseUrl, '/capabilities')
    const modelsUrl = withPath(routerBaseUrl, '/models')

    try {
      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
      })
      if (!healthResponse.ok) {
        return {
          ok: false,
          message: `Router health check failed with ${healthResponse.status}`,
          reachable: false,
          authenticated: false,
          contractMatched: false,
          expectedContract,
          healthStatus: undefined,
        }
      }

      const healthPayload = (await healthResponse.json()) as {
        status?: string
      }
      if (healthPayload.status !== 'ok') {
        return {
          ok: false,
          message: 'Router health check did not return status=ok',
          reachable: true,
          authenticated: false,
          contractMatched: false,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }

      const authHeaders = {
        authorization: `Bearer ${routerApiKey}`,
      }

      const capabilitiesResponse = await fetch(capabilitiesUrl, {
        method: 'GET',
        headers: authHeaders,
      })
      if (capabilitiesResponse.status === 401) {
        return {
          ok: false,
          message: 'Router API key is invalid',
          reachable: true,
          authenticated: false,
          contractMatched: false,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }
      if (capabilitiesResponse.status === 404) {
        return {
          ok: false,
          message:
            'Router is reachable but missing /capabilities. Deploy the latest router-agent service.',
          reachable: true,
          authenticated: true,
          contractMatched: false,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }
      if (!capabilitiesResponse.ok) {
        return {
          ok: false,
          message: `Router capabilities check failed with ${capabilitiesResponse.status}`,
          reachable: true,
          authenticated: true,
          contractMatched: false,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }

      const capabilitiesPayload = (await capabilitiesResponse.json()) as {
        contract?: string
      }
      const contractMatched = capabilitiesPayload.contract === expectedContract
      if (!contractMatched) {
        return {
          ok: false,
          message: `Router contract mismatch. Expected ${expectedContract}.`,
          reachable: true,
          authenticated: true,
          contractMatched: false,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }

      const modelsResponse = await fetch(modelsUrl, {
        method: 'GET',
        headers: authHeaders,
      })
      if (modelsResponse.status === 401) {
        return {
          ok: false,
          message: 'Router API key is invalid for model registry endpoint',
          reachable: true,
          authenticated: false,
          contractMatched: true,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }
      if (!modelsResponse.ok) {
        return {
          ok: false,
          message: `Router models check failed with ${modelsResponse.status}`,
          reachable: true,
          authenticated: true,
          contractMatched: true,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }

      const modelsPayload = (await modelsResponse.json()) as {
        version?: unknown
        count?: unknown
        models?: unknown
      }
      const modelsSchemaValid =
        typeof modelsPayload.version === 'number' &&
        typeof modelsPayload.count === 'number' &&
        Array.isArray(modelsPayload.models)

      if (!modelsSchemaValid) {
        return {
          ok: false,
          message: 'Router /models response schema is invalid',
          reachable: true,
          authenticated: true,
          contractMatched: true,
          expectedContract,
          healthStatus: healthPayload.status,
        }
      }

      return {
        ok: true,
        message: 'Router connection verified successfully',
        reachable: true,
        authenticated: true,
        contractMatched: true,
        expectedContract,
        healthStatus: healthPayload.status,
      }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error
            ? `Could not reach router: ${error.message}`
            : 'Could not reach router',
        reachable: false,
        authenticated: false,
        contractMatched: false,
        expectedContract,
        healthStatus: undefined,
      }
    }
  },
})

const autoModelStudioCatalogEntryValidator = v.object({
  modelId: v.string(),
  intelligence: v.number(),
  rawPrice: v.number(),
  speed: v.number(),
  latency: v.number(),
  taskScores: v.object({
    general: v.number(),
    code: v.number(),
    math: v.number(),
    analysis: v.number(),
  }),
  maxContextTokens: v.optional(v.number()),
  supportsTools: v.boolean(),
  tags: v.array(v.string()),
})

export const getAutoModelStudioCatalog = internalQuery({
  args: {},
  returns: v.array(autoModelStudioCatalogEntryValidator),
  handler: async (ctx) => {
    const [models, profiles] = await Promise.all([
      ctx.db.query('models').collect(),
      ctx.db.query('modelSelectionProfiles').collect(),
    ])
    const profileByModelId = new Map(profiles.map((profile) => [profile.modelId, profile]))

    return models.map((model) => {
      const profile = profileByModelId.get(model._id) ?? null
      const benchmarkScores = profile?.benchmarkScores
      const intelligence = clamp01(
        ((benchmarkScores?.chat ?? 0.5) +
          (benchmarkScores?.coding ?? 0.5) +
          (benchmarkScores?.analysis ?? 0.5)) /
          3,
      )
      const estimatedCost = estimateCostFromProfile(profile?.pricing, 1500, 700) ?? 0
      const latencyMs = profile?.latencyStats?.p95Ms ?? 2500
      const supportsTools = (model.capabilities ?? [])
        .map((item) => item.toLowerCase())
        .some((item) => item === 'tools' || item === 'tool_calling')

      return {
        modelId: model.modelId,
        intelligence,
        rawPrice: estimatedCost,
        speed: clamp01(1 - Math.min(latencyMs / 8000, 1)),
        latency: clamp01(Math.min(latencyMs / 8000, 1)),
        taskScores: normalizeTaskScores(benchmarkScores, intelligence),
        maxContextTokens: model.contextWindow,
        supportsTools,
        tags: model.capabilities ?? [],
      }
    })
  },
})

export const getAutoModelStudioSnapshot = action({
  args: {
    preference: v.optional(autoModelRouterPreferenceValidator),
  },
  returns: v.object({
    ok: v.boolean(),
    available: v.boolean(),
    message: v.string(),
    models: v.array(routerStudioModelValidator),
  }),
  handler: async (ctx, args) => {
    const adminContext = await ctx.runQuery(internal.admin.getAdminContext, {})
    if (!adminContext.isAdmin) {
      return {
        ok: false,
        available: false,
        message: 'Admin access required',
        models: [],
      }
    }

    const settings = await ctx.runQuery(api.admin.getAdminSettings, {})
    const routerUrl = settings.autoModelRouterUrl?.trim() ?? ''
    const routerApiKey = settings.autoModelRouterApiKey?.trim() ?? ''
    const preference = args.preference ?? settings.autoModelRouterPreference ?? 'balanced'

    if (
      settings.autoModelRoutingEnabled !== true ||
      !routerUrl ||
      !routerApiKey
    ) {
      return {
        ok: false,
        available: false,
        message: 'Auto model router is not configured',
        models: [],
      }
    }

    const routerBaseUrl = normalizeRouterBaseUrl(routerUrl)
    if (!routerBaseUrl) {
      return {
        ok: false,
        available: false,
        message: 'Router URL must be a valid http(s) URL',
        models: [],
      }
    }

    const rawCatalog = await ctx.runQuery(internal.admin.getAutoModelStudioCatalog, {})

    if (rawCatalog.length === 0) {
      return {
        ok: true,
        available: true,
        message: 'No models available to score',
        models: [],
      }
    }

    const maxPrice = Math.max(...rawCatalog.map((model) => model.rawPrice), 0.000001)
    const syncUrl = withPath(routerBaseUrl, '/models/update')
    const modelsUrl = withPath(routerBaseUrl, '/models')

    try {
      const syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${routerApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          models: rawCatalog.map((model) => ({
            name: model.modelId,
            intelligence: model.intelligence,
            price: clamp01(model.rawPrice / maxPrice),
            speed: model.speed,
            latency: model.latency,
            task_scores: model.taskScores,
            max_context_tokens: model.maxContextTokens,
            supports_tools: model.supportsTools,
            tags: model.tags,
          })),
        }),
      })
      if (!syncResponse.ok) {
        return {
          ok: false,
          available: true,
          message: `Model sync failed with ${syncResponse.status}`,
          models: [],
        }
      }

      const scoredResponse = await fetch(`${modelsUrl}?preference=${preference}`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${routerApiKey}`,
        },
      })
      if (!scoredResponse.ok) {
        return {
          ok: false,
          available: true,
          message: `Model scoring failed with ${scoredResponse.status}`,
          models: [],
        }
      }

      const payload = (await scoredResponse.json()) as {
        models?: Array<{
          name?: string
          studio_profile?: {
            auto_score?: number
            category?: 'Best default' | 'Coding' | 'Vision' | 'Long context' | 'Fast' | 'Budget' | 'Reasoning' | 'Needs metadata'
            quality_score?: number
            speed_score?: number
            cost_score?: number
            context_score?: number
            routing_tags?: string[]
            reasons?: string[]
          }
        }>
      }

      const scoredModels = (payload.models ?? [])
        .map((model) => {
          const profile = model.studio_profile
          if (
            !model.name ||
            !profile ||
            typeof profile.auto_score !== 'number' ||
            typeof profile.quality_score !== 'number' ||
            typeof profile.speed_score !== 'number' ||
            typeof profile.cost_score !== 'number' ||
            typeof profile.context_score !== 'number' ||
            typeof profile.category !== 'string'
          ) {
            return null
          }
          return {
            modelId: model.name,
            autoScore: profile.auto_score,
            category: profile.category,
            qualityScore: profile.quality_score,
            speedScore: profile.speed_score,
            costScore: profile.cost_score,
            contextScore: profile.context_score,
            routingTags: Array.isArray(profile.routing_tags) ? profile.routing_tags : [],
            reasons: Array.isArray(profile.reasons) ? profile.reasons : [],
          }
        })
        .filter((model): model is NonNullable<typeof model> => model !== null)

      return {
        ok: true,
        available: true,
        message: 'Python router scored the current model catalog',
        models: scoredModels,
      }
    } catch (error) {
      return {
        ok: false,
        available: true,
        message:
          error instanceof Error ? `Could not score models: ${error.message}` : 'Could not score models',
        models: [],
      }
    }
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

export const listAdminAccounts = query({
  args: {
    query: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(adminAccountRowValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { page: [], isDone: true, continueCursor: '' }
    }
    const isAdminLike = await hasAdminAccess(ctx, userId)
    if (!isAdminLike) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const needle = args.query?.trim().toLowerCase() ?? ''
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
        requests30d: number
        tokens30d: number
        models30d: Set<string>
        lastUsedAt: number
      }
    >()
    for (const event of usageEvents) {
      const existing = usageByUserId.get(event.userId) ?? {
        requests30d: 0,
        tokens30d: 0,
        models30d: new Set<string>(),
        lastUsedAt: 0,
      }
      existing.requests30d += 1
      existing.tokens30d += event.totalTokens
      existing.models30d.add(event.modelId)
      existing.lastUsedAt = Math.max(existing.lastUsedAt, event.createdAt)
      usageByUserId.set(event.userId, existing)
    }

    const rows = users
      .filter((candidate) => {
        if (!needle) {
          return true
        }
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
          requests30d: usage?.requests30d ?? 0,
          tokens30d: usage?.tokens30d ?? 0,
          models30d: usage?.models30d.size ?? 0,
          lastUsedAt: usage?.lastUsedAt,
        }
      })
      .sort((left, right) => {
        if (right.tokens30d !== left.tokens30d) {
          return right.tokens30d - left.tokens30d
        }
        return left.name.localeCompare(right.name)
      })

    return paginateResults(rows, {
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })
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
    const providerMap = new Map(providers.map((provider) => [provider._id, provider]))

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

export const listAdminProviders = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(dashboardProviderValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const rows = await listAdminProvidersInternal(ctx)
    return paginateResults(rows, {
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })
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
    const effectiveAppPlan = await resolveEffectiveAppPlan(ctx, settings, user ?? undefined)

    const enabledProviderIds = new Set(providers.map((provider) => provider._id))

    const nowMs = Date.now()
    const modelOffers = await ctx.db.query('modelOffers').collect()

    return models
      .filter((model) => {
        if (!enabledProviderIds.has(model.providerId)) {
          return false
        }
        const flags = getModelOfferAccessFlags(model._id, modelOffers, nowMs)
        if (flags.blocksAllAccess) {
          return false
        }
        return isModelUsableForPlan({
          model,
          effectiveAppPlan,
          hasActiveFreeAccessOffer: flags.grantsFreeAccess,
        })
      })
      .sort((left, right) => left.sortOrder - right.sortOrder)
  },
})

export const listModelsWithProviders = query({
  args: {},
  returns: v.object({
    autoModelAvailable: v.boolean(),
    collections: v.array(publicModelCollectionValidator),
    providers: v.array(providerSummaryValidator),
    favorites: v.array(modelWithProviderValidator),
    models: v.array(modelWithProviderValidator),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        autoModelAvailable: false,
        collections: [],
        providers: [],
        favorites: [],
        models: [],
      }
    }

    const [models, providers, favorites, settings, user, collections] = await Promise.all([
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
    const effectiveAppPlan = await resolveEffectiveAppPlan(ctx, settings, user ?? undefined)

    const nowMs = Date.now()
    const modelOffers = await ctx.db.query('modelOffers').collect()

    const favoriteModelIds = new Set(favorites.map((favorite) => favorite.modelId))
    const providerMap = new Map(providers.map((provider) => [provider._id, provider]))

    const modelsWithInfo = await Promise.all(
      models
        .filter((model) => {
          if (!providerMap.has(model.providerId)) {
            return false
          }
          const flags = getModelOfferAccessFlags(model._id, modelOffers, nowMs)
          if (flags.blocksAllAccess) {
            return false
          }
          return isModelUsableForPlan({
            model,
            effectiveAppPlan,
            hasActiveFreeAccessOffer: flags.grantsFreeAccess,
          })
        })
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
    const collectionRows = (
      await Promise.all(
        collections.map(async (collection) => {
          const modelIds = collection.modelIds.filter((modelId) => visibleModelIds.has(modelId))

          return {
            ...collection,
            iconUrl: collection.iconId
              ? ((await ctx.storage.getUrl(collection.iconId)) ?? undefined)
              : undefined,
            modelIds,
            modelCount: modelIds.length,
          }
        }),
      )
    )
      .filter((collection) => collection.modelCount > 0)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder
        }
        return left.name.localeCompare(right.name)
      })

    return {
      autoModelAvailable: isAutoModelRoutingAvailable(settings),
      collections: collectionRows,
      providers: sortedProviders,
      favorites: modelsWithInfo.filter((model) => model.isFavorite),
      models: modelsWithInfo.sort((left, right) => left.sortOrder - right.sortOrder),
    }
  },
})

export const getModelBrowserMetadata = query({
  args: {},
  returns: v.object({
    autoModelAvailable: v.boolean(),
    collections: v.array(publicModelCollectionValidator),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return {
        autoModelAvailable: false,
        collections: [],
      }
    }

    const { autoModelAvailable, collections } = await listBrowserModelsInternal(ctx, userId)
    return {
      autoModelAvailable,
      collections,
    }
  },
})

export const listModelsForBrowser = query({
  args: {
    paginationOpts: paginationOptsValidator,
    query: v.optional(v.string()),
    collectionId: v.optional(v.id('modelCollections')),
    favoritesOnly: v.optional(v.boolean()),
  },
  returns: v.object({
    page: v.array(modelWithProviderValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const { models, collections } = await listBrowserModelsInternal(ctx, userId)
    const activeCollection =
      args.collectionId === undefined
        ? undefined
        : collections.find((collection) => collection._id === args.collectionId)
    const allowedModelIds = activeCollection ? new Set(activeCollection.modelIds) : null
    const needle = args.query?.trim().toLowerCase() ?? ''

    const rows = models.filter((model) => {
      if (args.favoritesOnly && !model.isFavorite) {
        return false
      }
      if (allowedModelIds && !allowedModelIds.has(model._id)) {
        return false
      }
      if (!needle) {
        return true
      }
      return (
        model.displayName.toLowerCase().includes(needle) ||
        model.modelId.toLowerCase().includes(needle) ||
        model.description?.toLowerCase().includes(needle) ||
        model.provider?.name.toLowerCase().includes(needle) === true ||
        model.capabilities?.some((capability) => capability.toLowerCase().includes(needle)) ===
          true
      )
    })

    return paginateResults(rows, {
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })
  },
})

export const listAdminModels = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(dashboardModelValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const rows = await listAdminModelsInternal(ctx)
    return paginateResults(rows, {
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })
  },
})

export const listAdminCollections = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(dashboardModelCollectionValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const rows = await listAdminCollectionsInternal(ctx)
    return paginateResults(rows, {
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })
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
      .withIndex('by_user_model', (q) => q.eq('userId', userId).eq('modelId', args.modelId))
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
      .withIndex('by_user_model', (q) => q.eq('userId', userId).eq('modelId', args.modelId))
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
    supportedAttachmentMediaTypes: v.optional(v.array(v.string())),
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

    const attachmentValidation = resolveAttachmentValidationSnapshot({
      capabilities: args.capabilities,
      supportedAttachmentMediaTypes: args.supportedAttachmentMediaTypes,
    })

    return await ctx.db.insert('models', {
      ...args,
      ...attachmentValidation,
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
    supportedAttachmentMediaTypes: v.optional(v.array(v.string())),
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

    const currentModel = await ctx.db.get(id)
    if (!currentModel) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Model not found.',
      })
    }

    const attachmentValidation = resolveAttachmentValidationSnapshot({
      capabilities: updates.capabilities ?? currentModel.capabilities,
      supportedAttachmentMediaTypes:
        updates.supportedAttachmentMediaTypes ?? currentModel.supportedAttachmentMediaTypes,
    })

    await ctx.db.patch(
      id,
      cleanUpdates({
        ...updates,
        ...attachmentValidation,
      }),
    )
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

export const validateModelAttachmentPolicies = mutation({
  args: {
    modelId: v.optional(v.id('models')),
  },
  returns: v.object({
    validatedCount: v.number(),
    invalidCount: v.number(),
    updatedAt: v.number(),
  }),
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
        message: 'Not authorized to validate models.',
      })
    }

    const models = args.modelId
      ? [await ctx.db.get(args.modelId)]
      : await ctx.db.query('models').collect()
    const now = Date.now()
    let validatedCount = 0
    let invalidCount = 0

    for (const model of models) {
      if (!model) {
        continue
      }

      const snapshot = resolveAttachmentValidationSnapshot({
        capabilities: model.capabilities,
        supportedAttachmentMediaTypes: model.supportedAttachmentMediaTypes,
      })

      await ctx.db.patch(model._id, {
        ...snapshot,
        attachmentValidatedAt: now,
      })

      validatedCount += 1
      if (snapshot.attachmentValidationStatus === 'invalid') {
        invalidCount += 1
      }
    }

    return {
      validatedCount,
      invalidCount,
      updatedAt: now,
    }
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
            modelIds: collection.modelIds.filter((modelId) => modelId !== args.id),
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
    icon: v.optional(v.string()),
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')),
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
    icon: v.optional(v.string()),
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')),
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

const suggestedCollectionDraftValidator = v.object({
  name: v.string(),
  description: v.optional(v.string()),
  icon: v.optional(v.string()),
  iconType: v.optional(iconTypeValidator),
  sortOrder: v.number(),
  modelIds: v.array(v.id('models')),
})

export const suggestModelCollections = action({
  args: {
    prompt: v.optional(v.string()),
    includeHiddenModels: v.optional(v.boolean()),
  },
  returns: v.object({
    modelUsed: v.string(),
    collections: v.array(suggestedCollectionDraftValidator),
  }),
  handler: async (ctx, args) => {
    const adminContext = await ctx.runQuery(internal.admin.getAdminContext, {})
    if (!adminContext.userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'Not signed in.',
      })
    }

    if (!adminContext.isAdmin) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Not authorized to manage collections.',
      })
    }

    const [auxiliary, suggestionContext] = await Promise.all([
      ctx.runQuery(internal.auxiliaryModels.resolveAuxiliaryModel, {
        userId: adminContext.userId,
      }),
      ctx.runQuery(internal.admin.getCollectionSuggestionContext, {
        includeHiddenModels: args.includeHiddenModels ?? true,
      }),
    ])

    if (suggestionContext.models.length === 0) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'No models are available to group into collections.',
      })
    }

    const nextSortOrderBase = suggestionContext.existingCollectionNames.length
    const modelIdByString = new Map<string, Id<'models'>>()
    for (const model of suggestionContext.models) {
      modelIdByString.set(model._id, model._id)
    }
    const promptHeader = [
      'You are organizing AI chat models into user-facing collections.',
      'These collections will drive categories in the web model picker instead of provider-based grouping.',
      'Create several distinct, useful collections with clear names and concise descriptions.',
      'A model may appear in multiple collections when that improves discoverability.',
      'Only use model IDs that appear in the catalog below.',
      'Choose an icon for each collection. Use either iconType="phosphor" with one of these icons:',
      COLLECTION_AI_ICON_OPTIONS.join(', '),
      'or iconType="emoji" with a single emoji.',
      suggestionContext.existingCollectionNames.length > 0
        ? `Existing collection names to avoid duplicating: ${suggestionContext.existingCollectionNames.join(', ')}`
        : 'There are no existing collections yet.',
      args.prompt?.trim() ? `User goal: ${args.prompt.trim()}` : 'User goal: create sensible default collections.',
      '',
      'Catalog:',
      JSON.stringify(
        suggestionContext.models.map((model) => ({
          id: model._id,
          modelId: model.modelId,
          displayName: model.displayName,
          description: model.description,
          providerName: model.providerName,
          isEnabled: model.isEnabled,
          isFree: model.isFree,
          capabilities: model.capabilities ?? [],
          supportsReasoning: model.supportsReasoning ?? false,
          supportsAttachments: (model.supportedAttachmentMediaTypes?.length ?? 0) > 0,
        })),
      ),
    ].join('\n')

    const { object } = await generateObject({
      model: createLanguageModelFromAuxiliary(auxiliary),
      schema: collectionSuggestionSchema,
      temperature: 0.3,
      prompt: promptHeader,
    })

    const collections = object.collections
      .map((collection, index) => {
        const modelIds = [...new Set(collection.modelIds)]
          .map((modelId) => modelIdByString.get(modelId))
          .filter((modelId): modelId is Id<'models'> => modelId !== undefined)
        if (modelIds.length === 0) {
          return null
        }

        const normalizedName = collection.name.trim()
        if (!normalizedName) {
          return null
        }

        const normalizedDescription = collection.description?.trim() || undefined
        const iconSelection = normalizeSuggestedCollectionIcon(collection.iconType, collection.icon)

        return {
          name: normalizedName,
          description: normalizedDescription,
          icon: iconSelection.icon,
          iconType: iconSelection.iconType,
          sortOrder: nextSortOrderBase + index,
          modelIds,
        }
      })
      .filter((collection) => collection !== null)

    if (collections.length === 0) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'The AI model did not return any usable collection drafts.',
      })
    }

    return {
      modelUsed: auxiliary.displayName,
      collections,
    }
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
    const existingByModelId = new Map(existingModels.map((model) => [model.modelId, model]))
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
        attachmentValidationStatus: 'pending' as const,
        attachmentValidationMessage:
          'Needs validation. Save model attachment types or run validation.',
        attachmentValidatedAt: Date.now(),
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
        attachmentValidationStatus: 'pending',
        attachmentValidationMessage:
          'Needs validation. Save model attachment types or run validation.',
        attachmentValidatedAt: Date.now(),
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
    routerDecisionId: v.optional(v.string()),
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
          autoModelRoutingEnabled: false,
          autoModelRouterUrl: undefined,
          autoModelRouterApiKey: undefined,
          autoModelRouterPreference: 'balanced',
          defaultAuxiliaryModelId: undefined,
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
        autoRouting: {
          available: false,
          totalDecisions30d: 0,
          failedDecisions30d: 0,
          topModels: [],
          lastDecisionAt: undefined,
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
          autoModelRoutingEnabled: false,
          autoModelRouterUrl: undefined,
          autoModelRouterApiKey: undefined,
          autoModelRouterPreference: 'balanced',
          defaultAuxiliaryModelId: undefined,
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
        autoRouting: {
          available: false,
          totalDecisions30d: 0,
          failedDecisions30d: 0,
          topModels: [],
          lastDecisionAt: undefined,
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
      autoModelDecisions,
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
      ctx.db
        .query('autoModelDecisions')
        .withIndex('by_createdAt', (q) => q.gte('createdAt', since30d))
        .collect(),
      getAppBillingSubscription(ctx),
    ])
    const hasActiveSubscription = isStripeSubscriptionActive(billingSubscription)
    const effectiveAppPlan = hasActiveSubscription ? 'pro' : settings.appPlan

    const usageLast30d = usageEvents
    const usageLast7d = usageEvents.filter((event) => event.createdAt >= since7d)
    const favoritesByModelId = new Map<string, number>()
    for (const favorite of favorites) {
      favoritesByModelId.set(favorite.modelId, (favoritesByModelId.get(favorite.modelId) ?? 0) + 1)
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
            iconUrl: provider.iconId
              ? ((await ctx.storage.getUrl(provider.iconId)) ?? undefined)
              : undefined,
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

    const collectionRows = await Promise.all(
      collections
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(async (collection) => {
        const collectionModels = collection.modelIds
          .map((modelId) => modelRowMap.get(modelId))
          .filter((model): model is (typeof modelRows)[number] => Boolean(model))
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
          iconUrl: collection.iconId
            ? ((await ctx.storage.getUrl(collection.iconId)) ?? undefined)
            : undefined,
          modelCount: collectionModels.length,
          models: collectionModels,
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
          appPlan: user?.appPlan ?? DEFAULT_APP_PLAN,
          requests: usage.requests,
          tokens: usage.tokens,
          models: usage.models.size,
          lastUsedAt: usage.lastUsedAt,
        }
      })
      .sort((left, right) => right.tokens - left.tokens)

    const totalTokens = usageLast30d.reduce((sum, event) => sum + event.totalTokens, 0)
    const autoDecisionCounts = new Map<string, { name: string; count: number }>()
    let lastAutoDecisionAt: number | undefined
    for (const decision of autoModelDecisions) {
      if (decision.selectedModelKey && decision.selectedModelName) {
        const current = autoDecisionCounts.get(decision.selectedModelKey) ?? {
          name: decision.selectedModelName,
          count: 0,
        }
        current.count += 1
        autoDecisionCounts.set(decision.selectedModelKey, current)
      }
      lastAutoDecisionAt = Math.max(lastAutoDecisionAt ?? 0, decision.createdAt)
    }

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
        enabledProviders: providers.filter((provider) => provider.isEnabled).length,
        totalModels: models.length,
        visibleModels: models.filter((model) => model.isEnabled).length,
        hiddenModels: models.filter((model) => !model.isEnabled).length,
        totalRequests30d: usageLast30d.length,
        totalTokens30d: totalTokens,
        activeUsers30d: usageByUserId.size,
      },
      autoRouting: {
        available: isAutoModelRoutingAvailable(settings),
        totalDecisions30d: autoModelDecisions.length,
        failedDecisions30d: autoModelDecisions.filter((decision) => decision.status === 'failed')
          .length,
        topModels: [...autoDecisionCounts.entries()]
          .map(([modelId, value]) => ({
            modelId,
            modelName: value.name,
            count: value.count,
          }))
          .sort((left, right) => right.count - left.count)
          .slice(0, 5),
        lastDecisionAt: lastAutoDecisionAt,
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

export const listModelOffers = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(modelOfferRowValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      return { page: [], isDone: true, continueCursor: '' }
    }
    const offers = await ctx.db.query('modelOffers').collect()
    const rows = offers.sort((a, b) => b.endsAt - a.endsAt)
    return paginateResults(rows, {
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })
  },
})

export const createModelOffer = mutation({
  args: {
    modelId: v.id('models'),
    kind: modelOfferKindValidator,
    startsAt: v.number(),
    endsAt: v.number(),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
  },
  returns: v.id('modelOffers'),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    if (args.startsAt >= args.endsAt) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'startsAt must be before endsAt',
      })
    }
    const model = await ctx.db.get(args.modelId)
    if (!model) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Model not found',
      })
    }
    const now = Date.now()
    return await ctx.db.insert('modelOffers', {
      modelId: args.modelId,
      kind: args.kind,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      label: args.label,
      description: args.description,
      isEnabled: args.isEnabled ?? true,
      updatedAt: now,
    })
  },
})

export const updateModelOffer = mutation({
  args: {
    offerId: v.id('modelOffers'),
    kind: v.optional(modelOfferKindValidator),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const existing = await ctx.db.get(args.offerId)
    if (!existing) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Offer not found',
      })
    }
    const startsAt = args.startsAt ?? existing.startsAt
    const endsAt = args.endsAt ?? existing.endsAt
    if (startsAt >= endsAt) {
      throw new ConvexError({
        code: 'INVALID_ARGUMENT',
        message: 'startsAt must be before endsAt',
      })
    }
    await ctx.db.patch(args.offerId, {
      ...(args.kind !== undefined ? { kind: args.kind } : {}),
      ...(args.startsAt !== undefined ? { startsAt: args.startsAt } : {}),
      ...(args.endsAt !== undefined ? { endsAt: args.endsAt } : {}),
      ...(args.label !== undefined ? { label: args.label } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.isEnabled !== undefined ? { isEnabled: args.isEnabled } : {}),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const deleteModelOffer = mutation({
  args: { offerId: v.id('modelOffers') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const existing = await ctx.db.get(args.offerId)
    if (!existing) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Offer not found',
      })
    }
    await ctx.db.delete(args.offerId)
    return null
  },
})
