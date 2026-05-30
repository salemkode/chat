import type { Doc, Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { estimateCostFromProfile } from './pricingTier'
import { modelIsAuxiliaryEligible, modelSupportsTools } from './modelCapabilities'
import { getModelOfferAccessFlags } from './modelOffersAccess'
import { isModelUsableForPlan } from './appPlan'
import { resolveEffectiveAppPlan } from './billing'

const EXTRACTION_INPUT_TOKENS = 2000
const EXTRACTION_OUTPUT_TOKENS = 500

export type AuxiliaryModelCandidate = {
  modelDocId: Id<'models'>
  modelId: string
  displayName: string
  estimatedCostPerExtraction: number | null
  supportsTools: true
  isRecommended: boolean
}

export type ResolvedAuxiliaryModel = {
  modelDocId: Id<'models'> | null
  modelId: string
  displayName: string
  providerType: Doc<'providers'>['providerType']
  providerDocId: Id<'providers'> | null
  apiKey?: string
  customUrl?: string
  config?: Doc<'providers'>['config']
}

export function hasConfiguredAuxiliaryModel(resolved: ResolvedAuxiliaryModel) {
  return resolved.modelDocId !== null && resolved.providerDocId !== null
}

function unconfiguredAuxiliaryModel(): ResolvedAuxiliaryModel {
  return {
    modelDocId: null,
    modelId: '',
    displayName: '',
    providerType: 'openrouter',
    providerDocId: null,
  }
}

type RankableModel = {
  model: Doc<'models'>
  provider: Doc<'providers'>
  profile: Doc<'modelSelectionProfiles'> | null
  estimatedCost: number | null
}

function rankAuxiliaryModels(models: RankableModel[]) {
  return [...models].sort((left, right) => {
    const leftCost = left.estimatedCost ?? Number.POSITIVE_INFINITY
    const rightCost = right.estimatedCost ?? Number.POSITIVE_INFINITY
    if (leftCost !== rightCost) {
      return leftCost - rightCost
    }

    const leftHaiku = left.model.modelId.toLowerCase().includes('haiku') ? 0 : 1
    const rightHaiku = right.model.modelId.toLowerCase().includes('haiku') ? 0 : 1
    if (leftHaiku !== rightHaiku) {
      return leftHaiku - rightHaiku
    }

    const leftContext = left.model.contextWindow ?? left.profile?.contextWindow ?? Number.MAX_SAFE_INTEGER
    const rightContext = right.model.contextWindow ?? right.profile?.contextWindow ?? Number.MAX_SAFE_INTEGER
    if (leftContext !== rightContext) {
      return leftContext - rightContext
    }

    const leftReliability = left.profile?.toolCallReliability ?? 0
    const rightReliability = right.profile?.toolCallReliability ?? 0
    return rightReliability - leftReliability
  })
}

export async function listAccessibleAuxiliaryRankables(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<RankableModel[]> {
  const [models, providers, profiles, adminSettings, user, modelOffers] = await Promise.all([
    ctx.db
      .query('models')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect(),
    ctx.db
      .query('providers')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect(),
    ctx.db.query('modelSelectionProfiles').collect(),
    ctx.db
      .query('adminSettings')
      .withIndex('by_key', (q) => q.eq('key', 'global'))
      .first(),
    ctx.db.get(userId),
    ctx.db.query('modelOffers').collect(),
  ])

  const effectiveAppPlan = await resolveEffectiveAppPlan(
    ctx,
    adminSettings ?? undefined,
    user ?? undefined,
  )

  const providerById = new Map(providers.map((provider) => [provider._id, provider]))
  const profileByModelId = new Map(profiles.map((profile) => [profile.modelId, profile]))
  const nowMs = Date.now()

  const toolCapable = models.filter((model) => {
    const provider = providerById.get(model.providerId)
    if (!provider) {
      return false
    }

    const profile = profileByModelId.get(model._id) ?? null
    const capabilities = profile?.capabilities ?? model.capabilities ?? []
    if (!modelSupportsTools(capabilities)) {
      return false
    }

    const offerFlags = getModelOfferAccessFlags(model._id, modelOffers, nowMs)
    if (offerFlags.blocksAllAccess) {
      return false
    }

    return isModelUsableForPlan({
      model,
      effectiveAppPlan,
      hasActiveFreeAccessOffer: offerFlags.grantsFreeAccess,
    })
  })

  const hasAuxiliaryTagged = toolCapable.some((model) => {
    const profile = profileByModelId.get(model._id) ?? null
    const capabilities = profile?.capabilities ?? model.capabilities ?? []
    return modelIsAuxiliaryEligible(capabilities)
  })

  const eligible = toolCapable.filter((model) => {
    if (!hasAuxiliaryTagged) {
      return true
    }
    const profile = profileByModelId.get(model._id) ?? null
    const capabilities = profile?.capabilities ?? model.capabilities ?? []
    return modelIsAuxiliaryEligible(capabilities)
  })

  return rankAuxiliaryModels(
    eligible.map((model) => {
      const profile = profileByModelId.get(model._id) ?? null
      return {
        model,
        provider: providerById.get(model.providerId)!,
        profile,
        estimatedCost: estimateCostFromProfile(
          profile?.pricing,
          EXTRACTION_INPUT_TOKENS,
          EXTRACTION_OUTPUT_TOKENS,
        ),
      }
    }),
  )
}

export function toAuxiliaryCandidates(
  rankables: RankableModel[],
  selectedModelDocId?: Id<'models'> | null,
): AuxiliaryModelCandidate[] {
  if (rankables.length === 0) {
    return []
  }

  const recommendedId = rankables[0]!.model._id
  const selectedStillEligible =
    selectedModelDocId && rankables.some((item) => item.model._id === selectedModelDocId)

  return rankables.map((item) => ({
    modelDocId: item.model._id,
    modelId: item.model.modelId,
    displayName: item.model.displayName,
    estimatedCostPerExtraction: item.estimatedCost,
    supportsTools: true as const,
    isRecommended: selectedStillEligible
      ? item.model._id === selectedModelDocId
      : item.model._id === recommendedId,
  }))
}

export async function resolveAuxiliaryModelForUser(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<ResolvedAuxiliaryModel> {
  const [settings, adminSettings, rankables] = await Promise.all([
    ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique(),
    ctx.db
      .query('adminSettings')
      .withIndex('by_key', (q) => q.eq('key', 'global'))
      .first(),
    listAccessibleAuxiliaryRankables(ctx, userId),
  ])

  const preferredIds = [settings?.auxiliaryModelId, adminSettings?.defaultAuxiliaryModelId].filter(
    (id): id is Id<'models'> => id !== undefined,
  )

  for (const preferredId of preferredIds) {
    const match = rankables.find((item) => item.model._id === preferredId)
    if (match) {
      return {
        modelDocId: match.model._id,
        modelId: match.model.modelId,
        displayName: match.model.displayName,
        providerType: match.provider.providerType,
        providerDocId: match.provider._id,
        apiKey: match.provider.apiKey,
        customUrl: match.provider.baseURL,
        config: match.provider.config,
      }
    }
  }

  return unconfiguredAuxiliaryModel()
}
