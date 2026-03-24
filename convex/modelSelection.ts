import { mutation, query } from './_generated/server'
import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { getAuthUserId } from './lib/auth'

const selectionTierValidator = v.union(
  v.literal('free'),
  v.literal('pro'),
  v.literal('advanced'),
  // Backward compatibility aliases:
  v.literal('light'),
  v.literal('medium'),
)

const selectionTaskTypeValidator = v.union(
  v.literal('chat'),
  v.literal('coding'),
  v.literal('analysis'),
  v.literal('rewrite'),
  v.literal('qa'),
)

const selectionRequestContextValidator = v.object({
  prompt: v.optional(v.string()),
  promptChars: v.optional(v.number()),
  estimatedInputTokens: v.optional(v.number()),
  estimatedOutputTokens: v.optional(v.number()),
  taskType: v.optional(selectionTaskTypeValidator),
  complexityScore: v.optional(v.number()),
  requiresTools: v.optional(v.boolean()),
  toolTypes: v.optional(v.array(v.string())),
  requiresReasoning: v.optional(v.boolean()),
  needsLongContext: v.optional(v.boolean()),
  attachmentTypes: v.optional(v.array(v.string())),
})

const selectionConstraintsValidator = v.object({
  maxCost: v.optional(v.number()),
  maxLatencyMs: v.optional(v.number()),
  hardCostLimit: v.optional(v.boolean()),
  hardLatencyLimit: v.optional(v.boolean()),
})

const selectionScoreBreakdownValidator = v.object({
  qualityFit: v.number(),
  costFit: v.number(),
  speedFit: v.number(),
  toolFit: v.number(),
  contextFit: v.number(),
  riskPenalty: v.number(),
  totalScore: v.number(),
})

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function canonicalizeTier(
  tier: 'free' | 'pro' | 'advanced' | 'light' | 'medium',
): 'free' | 'pro' | 'advanced' {
  if (tier === 'light') return 'free'
  if (tier === 'medium') return 'pro'
  return tier
}

function normalizeTaskType(
  context: {
    taskType?: 'chat' | 'coding' | 'analysis' | 'rewrite' | 'qa'
    prompt?: string
  } | null,
): 'chat' | 'coding' | 'analysis' | 'rewrite' | 'qa' {
  if (context?.taskType) {
    return context.taskType
  }
  const prompt = (context?.prompt || '').toLowerCase()
  if (/\b(code|debug|refactor|typescript|python|sql)\b/.test(prompt)) {
    return 'coding'
  }
  if (/\b(analy[sz]e|compare|tradeoff|design|architecture)\b/.test(prompt)) {
    return 'analysis'
  }
  if (/\b(rewrite|paraphrase|edit|proofread)\b/.test(prompt)) {
    return 'rewrite'
  }
  if (/\b(question|q:|answer)\b/.test(prompt)) {
    return 'qa'
  }
  return 'chat'
}

function estimateTokens(args: {
  prompt?: string
  promptChars?: number
  estimatedInputTokens?: number
  estimatedOutputTokens?: number
}) {
  const promptChars = args.promptChars ?? args.prompt?.length ?? 0
  const input = args.estimatedInputTokens ?? Math.max(64, Math.ceil(promptChars / 4))
  const output = args.estimatedOutputTokens ?? 500
  return { input, output }
}

function computeComplexityScore(args: {
  prompt?: string
  complexityScore?: number
  estimatedInputTokens: number
  requiresTools: boolean
  requiresReasoning: boolean
  needsLongContext: boolean
}) {
  if (typeof args.complexityScore === 'number') {
    return clamp01(args.complexityScore)
  }
  let score = 0.2
  score += Math.min(args.estimatedInputTokens / 8000, 0.35)
  if (args.requiresTools) score += 0.15
  if (args.requiresReasoning) score += 0.2
  if (args.needsLongContext) score += 0.15
  const prompt = (args.prompt || '').toLowerCase()
  if (/\b(architecture|multi-step|benchmark|algorithm|optimize)\b/.test(prompt)) {
    score += 0.1
  }
  return clamp01(score)
}

function computeDynamicWeights(args: {
  base: {
    quality: number
    cost: number
    speed: number
    tool: number
    context: number
    risk: number
  }
  complexityScore: number
}) {
  const { base } = args
  const complexity = clamp01(args.complexityScore)
  const simpleBias = 1 - complexity
  const complexBias = complexity

  return {
    quality: base.quality + complexBias * 0.2 - simpleBias * 0.12,
    cost: base.cost + simpleBias * 0.12 - complexBias * 0.04,
    speed: base.speed + simpleBias * 0.22 - complexBias * 0.12,
    tool: base.tool,
    context: base.context + complexBias * 0.05,
    risk: base.risk + complexBias * 0.05,
  }
}

function deterministicDecisionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `decision_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

async function hasAdminAccess(ctx: Parameters<typeof getAuthUserId>[0], userId: Id<'users'>) {
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

type Candidate = {
  model: Doc<'models'>
  provider: Doc<'providers'>
  profile: Doc<'modelSelectionProfiles'> | null
  score: number
  estimatedCost: number | null
  breakdown: {
    qualityFit: number
    costFit: number
    speedFit: number
    toolFit: number
    contextFit: number
    riskPenalty: number
    totalScore: number
  }
}

export const upsertModelSelectionProfile = mutation({
  args: {
    modelId: v.id('models'),
    tierAllowed: v.array(selectionTierValidator),
    pricing: v.optional(
      v.object({
        inputPer1M: v.number(),
        outputPer1M: v.number(),
        currency: v.optional(v.string()),
      }),
    ),
    latencyStats: v.optional(
      v.object({
        p50Ms: v.number(),
        p95Ms: v.number(),
      }),
    ),
    contextWindow: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    capabilities: v.optional(v.array(v.string())),
    toolCallReliability: v.optional(v.number()),
    benchmarkScores: v.optional(v.record(v.string(), v.number())),
    historicalSuccessRate: v.optional(v.number()),
    riskScore: v.optional(v.number()),
    isExternal: v.optional(v.boolean()),
  },
  returns: v.id('modelSelectionProfiles'),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      })
    }

    const model = await ctx.db.get(args.modelId)
    if (!model) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Model not found',
      })
    }

    const existing = await ctx.db
      .query('modelSelectionProfiles')
      .withIndex('by_modelId', (q) => q.eq('modelId', args.modelId))
      .first()

    const patch = {
      modelId: args.modelId,
      providerId: model.providerId,
      tierAllowed: [...new Set(args.tierAllowed.map((tier) => canonicalizeTier(tier)))],
      pricing: args.pricing,
      latencyStats: args.latencyStats,
      contextWindow: args.contextWindow,
      maxOutputTokens: args.maxOutputTokens,
      capabilities: args.capabilities,
      toolCallReliability: args.toolCallReliability,
      benchmarkScores: args.benchmarkScores,
      historicalSuccessRate: args.historicalSuccessRate,
      riskScore: args.riskScore,
      isExternal: args.isExternal,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert('modelSelectionProfiles', patch)
  },
})

export const upsertRoutingPolicy = mutation({
  args: {
    id: v.optional(v.id('modelRoutingPolicies')),
    tier: selectionTierValidator,
    taskType: v.optional(selectionTaskTypeValidator),
    isEnabled: v.boolean(),
    maxCostPerRequest: v.optional(v.number()),
    maxLatencyMs: v.optional(v.number()),
    minQualityScore: v.optional(v.number()),
    qualityWeight: v.optional(v.number()),
    costWeight: v.optional(v.number()),
    speedWeight: v.optional(v.number()),
    toolWeight: v.optional(v.number()),
    contextWeight: v.optional(v.number()),
    riskWeight: v.optional(v.number()),
    allowedModelIds: v.optional(v.array(v.id('models'))),
    fallbackModelIds: v.optional(v.array(v.id('models'))),
  },
  returns: v.id('modelRoutingPolicies'),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      })
    }

    const patch = {
      tier: canonicalizeTier(args.tier),
      taskType: args.taskType,
      isEnabled: args.isEnabled,
      maxCostPerRequest: args.maxCostPerRequest,
      maxLatencyMs: args.maxLatencyMs,
      minQualityScore: args.minQualityScore,
      qualityWeight: args.qualityWeight,
      costWeight: args.costWeight,
      speedWeight: args.speedWeight,
      toolWeight: args.toolWeight,
      contextWeight: args.contextWeight,
      riskWeight: args.riskWeight,
      allowedModelIds: args.allowedModelIds,
      fallbackModelIds: args.fallbackModelIds,
      updatedAt: Date.now(),
    }

    if (args.id) {
      await ctx.db.patch(args.id, patch)
      return args.id
    }

    const existing =
      args.taskType === undefined
        ? (
            await ctx.db
              .query('modelRoutingPolicies')
              .withIndex('by_tier', (q) => q.eq('tier', canonicalizeTier(args.tier)))
              .collect()
          ).find((item) => item.taskType === undefined)
        : await ctx.db
            .query('modelRoutingPolicies')
            .withIndex('by_tier_taskType', (q) =>
              q.eq('tier', canonicalizeTier(args.tier)).eq('taskType', args.taskType),
            )
            .first()

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return existing._id
    }

    return await ctx.db.insert('modelRoutingPolicies', patch)
  },
})

export const selectModel = mutation({
  args: {
    tier: selectionTierValidator,
    requestContext: v.optional(selectionRequestContextValidator),
    requiresTools: v.optional(
      v.object({
        enabled: v.boolean(),
        toolTypes: v.optional(v.array(v.string())),
      }),
    ),
    requiresReasoning: v.optional(
      v.object({
        enabled: v.boolean(),
        level: v.optional(v.union(v.literal('low'), v.literal('medium'), v.literal('high'))),
      }),
    ),
    constraints: v.optional(selectionConstraintsValidator),
    threadId: v.optional(v.string()),
    userId: v.optional(v.id('users')),
  },
  returns: v.object({
    decisionId: v.string(),
    selectedModel: v.object({
      modelDocId: v.id('models'),
      modelId: v.string(),
      modelName: v.string(),
      providerDocId: v.id('providers'),
      providerName: v.string(),
      providerType: v.string(),
    }),
    taskType: selectionTaskTypeValidator,
    complexityScore: v.number(),
    estimatedCost: v.union(v.number(), v.null()),
    scoreBreakdown: selectionScoreBreakdownValidator,
    fallbackChain: v.array(
      v.object({
        modelDocId: v.id('models'),
        modelName: v.string(),
        providerName: v.string(),
      }),
    ),
    consideredModels: v.array(
      v.object({
        modelDocId: v.id('models'),
        modelName: v.string(),
        score: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const now = Date.now()
    const tier = canonicalizeTier(args.tier)
    const context = args.requestContext ?? {}
    const taskType = normalizeTaskType(context)
    const requiresTools = args.requiresTools?.enabled ?? context.requiresTools === true
    const requiresReasoning =
      args.requiresReasoning?.enabled ?? context.requiresReasoning === true
    const needsLongContext = context.needsLongContext === true
    const estimated = estimateTokens(context)
    const complexityScore = computeComplexityScore({
      prompt: context.prompt,
      complexityScore: context.complexityScore,
      estimatedInputTokens: estimated.input,
      requiresTools,
      requiresReasoning,
      needsLongContext,
    })

    const [models, providers, profiles, tierPolicies, taskPolicies] = await Promise.all([
      ctx.db.query('models').withIndex('by_enabled', (q) => q.eq('isEnabled', true)).collect(),
      ctx.db
        .query('providers')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db.query('modelSelectionProfiles').collect(),
      ctx.db
        .query('modelRoutingPolicies')
        .withIndex('by_tier', (q) => q.eq('tier', tier))
        .collect(),
      ctx.db
        .query('modelRoutingPolicies')
        .withIndex('by_tier_taskType', (q) => q.eq('tier', tier).eq('taskType', taskType))
        .collect(),
    ])

    const providerById = new Map(providers.map((provider) => [provider._id, provider]))
    const profileByModelId = new Map(profiles.map((profile) => [profile.modelId, profile]))
    const policy = (taskPolicies.find((item) => item.isEnabled) ||
      tierPolicies.find((item) => item.isEnabled) ||
      null) as Doc<'modelRoutingPolicies'> | null

    const constraints = {
      maxCost: args.constraints?.maxCost ?? policy?.maxCostPerRequest,
      maxLatencyMs: args.constraints?.maxLatencyMs ?? policy?.maxLatencyMs,
      hardCostLimit: args.constraints?.hardCostLimit ?? true,
      hardLatencyLimit: args.constraints?.hardLatencyLimit ?? false,
    }

    const baseWeights = {
      quality: policy?.qualityWeight ?? 0.4,
      cost: policy?.costWeight ?? 0.2,
      speed: policy?.speedWeight ?? 0.2,
      tool: policy?.toolWeight ?? 0.1,
      context: policy?.contextWeight ?? 0.1,
      risk: policy?.riskWeight ?? 0.15,
    }
    const weights = computeDynamicWeights({
      base: baseWeights,
      complexityScore,
    })

    const candidates: Candidate[] = []
    for (const model of models) {
      const provider = providerById.get(model.providerId)
      if (!provider || !provider.isEnabled) {
        continue
      }

      if (policy?.allowedModelIds?.length && !policy.allowedModelIds.includes(model._id)) {
        continue
      }

      const profile = profileByModelId.get(model._id) ?? null
      const tierAllowed = profile?.tierAllowed ?? ['free', 'pro', 'advanced']
      if (!tierAllowed.includes(tier)) {
        continue
      }

      const capabilities = new Set(
        (profile?.capabilities ?? model.capabilities ?? []).map((item) =>
          item.trim().toLowerCase(),
        ),
      )
      if (requiresTools && !capabilities.has('tools') && !capabilities.has('tool_calling')) {
        continue
      }
      if (requiresReasoning && !capabilities.has('reasoning')) {
        continue
      }

      const contextWindow = profile?.contextWindow ?? model.contextWindow
      if (needsLongContext && contextWindow && contextWindow < estimated.input) {
        continue
      }

      const pricing = profile?.pricing
      const estimatedCost = pricing
        ? ((estimated.input / 1_000_000) * pricing.inputPer1M +
            (estimated.output / 1_000_000) * pricing.outputPer1M)
        : null
      if (
        constraints.maxCost !== undefined &&
        estimatedCost !== null &&
        constraints.hardCostLimit &&
        estimatedCost > constraints.maxCost
      ) {
        continue
      }

      const p95Ms = profile?.latencyStats?.p95Ms
      if (
        constraints.maxLatencyMs !== undefined &&
        p95Ms !== undefined &&
        constraints.hardLatencyLimit &&
        p95Ms > constraints.maxLatencyMs
      ) {
        continue
      }

      const benchmarkScores = profile?.benchmarkScores ?? {}
      const qualityFromBench = clamp01(benchmarkScores[taskType] ?? 0.5)
      const historicalSuccessRate = clamp01(profile?.historicalSuccessRate ?? 0.75)
      const qualityFit = clamp01(qualityFromBench * 0.7 + historicalSuccessRate * 0.3)

      const costFit =
        estimatedCost === null || constraints.maxCost === undefined
          ? 0.6
          : clamp01(1 - estimatedCost / Math.max(constraints.maxCost, 0.000001))
      const speedFit =
        p95Ms === undefined || constraints.maxLatencyMs === undefined
          ? 0.6
          : clamp01(1 - p95Ms / Math.max(constraints.maxLatencyMs, 1))
      const toolFit = requiresTools
        ? clamp01(profile?.toolCallReliability ?? (capabilities.has('tools') ? 0.7 : 0))
        : 1
      const contextFit = contextWindow
        ? clamp01(contextWindow / Math.max(estimated.input, 1))
        : needsLongContext
          ? 0.25
          : 0.7
      const riskPenalty = clamp01(profile?.riskScore ?? 0.1)
      const totalScore =
        qualityFit * weights.quality +
        costFit * weights.cost +
        speedFit * weights.speed +
        toolFit * weights.tool +
        contextFit * weights.context -
        riskPenalty * weights.risk

      if (policy?.minQualityScore !== undefined && qualityFit < policy.minQualityScore) {
        continue
      }

      candidates.push({
        model,
        provider,
        profile,
        score: totalScore,
        estimatedCost,
        breakdown: {
          qualityFit,
          costFit,
          speedFit,
          toolFit,
          contextFit,
          riskPenalty,
          totalScore,
        },
      })
    }

    if (candidates.length === 0) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'No eligible model found for the given tier and constraints',
      })
    }

    candidates.sort((a, b) => b.score - a.score)
    const selected = candidates[0]

    const fallbackIds = new Set<Id<'models'>>()
    if (policy?.fallbackModelIds?.length) {
      for (const id of policy.fallbackModelIds) {
        fallbackIds.add(id)
      }
    } else if (tier === 'pro') {
      for (const candidate of candidates.slice(1, 2)) {
        fallbackIds.add(candidate.model._id)
      }
    } else if (tier === 'advanced') {
      for (const candidate of candidates.slice(1, 4)) {
        fallbackIds.add(candidate.model._id)
      }
    }
    fallbackIds.delete(selected.model._id)
    const fallbackChain = candidates.filter((candidate) => fallbackIds.has(candidate.model._id))

    const decisionId = deterministicDecisionId()
    await ctx.db.insert('routerEvents', {
      decisionId,
      userId: args.userId,
      threadId: args.threadId,
      tier,
      taskType,
      complexityScore,
      requiresTools,
      requiresReasoning,
      selectedModelId: selected.model._id,
      selectedProviderId: selected.provider._id,
      candidateModelIds: candidates.map((candidate) => candidate.model._id),
      fallbackModelIds: fallbackChain.map((candidate) => candidate.model._id),
      estimatedInputTokens: estimated.input,
      estimatedOutputTokens: estimated.output,
      estimatedCost: selected.estimatedCost ?? undefined,
      maxCostConstraint: constraints.maxCost,
      maxLatencyConstraint: constraints.maxLatencyMs,
      scoreBreakdown: selected.breakdown,
      createdAt: now,
      updatedAt: now,
    })

    return {
      decisionId,
      selectedModel: {
        modelDocId: selected.model._id,
        modelId: selected.model.modelId,
        modelName: selected.model.displayName,
        providerDocId: selected.provider._id,
        providerName: selected.provider.name,
        providerType: selected.provider.providerType,
      },
      taskType,
      complexityScore,
      estimatedCost: selected.estimatedCost,
      scoreBreakdown: selected.breakdown,
      fallbackChain: fallbackChain.map((candidate) => ({
        modelDocId: candidate.model._id,
        modelName: candidate.model.displayName,
        providerName: candidate.provider.name,
      })),
      consideredModels: candidates.slice(0, 8).map((candidate) => ({
        modelDocId: candidate.model._id,
        modelName: candidate.model.displayName,
        score: candidate.score,
      })),
    }
  },
})

export const reportOutcome = mutation({
  args: {
    decisionId: v.string(),
    finalModelId: v.optional(v.id('models')),
    fallbackUsed: v.boolean(),
    finalSuccess: v.boolean(),
    validationPassed: v.optional(v.boolean()),
    latencyMs: v.optional(v.number()),
    actualCost: v.optional(v.number()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    qualityLabel: v.optional(v.number()),
    costLabel: v.optional(v.number()),
    latencyLabel: v.optional(v.number()),
    promptHash: v.optional(v.string()),
    promptPreview: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('routerEvents')
      .withIndex('by_decisionId', (q) => q.eq('decisionId', args.decisionId))
      .first()
    if (!event) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Decision not found',
      })
    }

    await ctx.db.patch(event._id, {
      fallbackUsed: args.fallbackUsed,
      finalModelId: args.finalModelId,
      finalSuccess: args.finalSuccess,
      validationPassed: args.validationPassed,
      latencyMs: args.latencyMs,
      actualCost: args.actualCost,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      updatedAt: Date.now(),
    })

    const winningModelId = args.finalModelId ?? event.selectedModelId
    const profile = await ctx.db
      .query('modelSelectionProfiles')
      .withIndex('by_modelId', (q) => q.eq('modelId', winningModelId))
      .first()
    if (profile) {
      const previous = clamp01(profile.historicalSuccessRate ?? 0.75)
      const next = clamp01(previous * 0.9 + (args.finalSuccess ? 1 : 0) * 0.1)
      await ctx.db.patch(profile._id, {
        historicalSuccessRate: next,
        updatedAt: Date.now(),
      })
    }

    if (args.promptHash) {
      await ctx.db.insert('trainingExamples', {
        source: 'production',
        taskType: event.taskType,
        tier: event.tier,
        promptHash: args.promptHash,
        promptPreview: args.promptPreview,
        targetModelId: winningModelId,
        qualityLabel: args.qualityLabel,
        costLabel: args.costLabel,
        latencyLabel: args.latencyLabel,
        successLabel: args.finalSuccess,
        split: 'train',
        metadata: {
          decisionId: event.decisionId,
          fallbackUsed: String(args.fallbackUsed),
        },
        createdAt: Date.now(),
      })
    }

    return { ok: true }
  },
})

export const ingestTrainingExamples = mutation({
  args: {
    examples: v.array(
      v.object({
        source: v.union(
          v.literal('benchmark'),
          v.literal('production'),
          v.literal('synthetic'),
        ),
        taskType: selectionTaskTypeValidator,
        tier: v.optional(selectionTierValidator),
        promptHash: v.string(),
        promptPreview: v.optional(v.string()),
        targetModelId: v.optional(v.id('models')),
        targetResponse: v.optional(v.string()),
        qualityLabel: v.optional(v.number()),
        costLabel: v.optional(v.number()),
        latencyLabel: v.optional(v.number()),
        successLabel: v.optional(v.boolean()),
        split: v.optional(
          v.union(v.literal('train'), v.literal('validation'), v.literal('test')),
        ),
        metadata: v.optional(v.record(v.string(), v.string())),
      }),
    ),
  },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !(await hasAdminAccess(ctx, userId))) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Admin access required',
      })
    }

    let inserted = 0
    for (const example of args.examples) {
      await ctx.db.insert('trainingExamples', {
        ...example,
        createdAt: Date.now(),
      })
      inserted += 1
    }
    return { inserted }
  },
})

export const listRoutingPolicies = query({
  args: {
    tier: v.optional(selectionTierValidator),
  },
  handler: async (ctx, args) => {
    const tier = args.tier ? canonicalizeTier(args.tier) : undefined
    if (tier) {
      return await ctx.db
        .query('modelRoutingPolicies')
        .withIndex('by_tier', (q) => q.eq('tier', tier))
        .collect()
    }
    return await ctx.db.query('modelRoutingPolicies').collect()
  },
})
