import { action, internalMutation, internalQuery } from './_generated/server'
import { api, components, internal } from './_generated/api'
import { ConvexError, v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
import { estimateCostFromProfile } from './lib/pricingTier'

const autoModelRouterPreferenceValidator = v.union(
  v.literal('balanced'),
  v.literal('cost'),
  v.literal('speed'),
  v.literal('quality'),
)

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
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

function deterministicDecisionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
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

function normalizeRequestPreview(prompt: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim()
  return normalized.slice(0, 280)
}

const IMAGE_INPUT_CAPABILITIES = new Set([
  'vision',
  'image',
  'images',
  'image-input',
  'multimodal',
  'multi-modal',
  'attachments',
])

function supportsImageInput(capabilities: string[] | undefined) {
  if (!capabilities || capabilities.length === 0) {
    return false
  }
  return capabilities.some((capability) => IMAGE_INPUT_CAPABILITIES.has(capability.toLowerCase()))
}

function getAttachmentSummaryFromPromptContent(content: unknown) {
  let imageCount = 0
  let fileCount = 0

  if (!Array.isArray(content)) {
    return {
      imageCount: 0,
      fileCount: 0,
      totalCount: 0,
    }
  }

  for (const part of content) {
    if (!part || typeof part !== 'object') {
      continue
    }
    const typedPart = part as { type?: unknown; mediaType?: unknown }
    if (typedPart.type === 'image') {
      imageCount += 1
      continue
    }
    if (typedPart.type === 'file') {
      if (typeof typedPart.mediaType === 'string' && typedPart.mediaType.startsWith('image/')) {
        imageCount += 1
      } else {
        fileCount += 1
      }
    }
  }

  return {
    imageCount,
    fileCount,
    totalCount: imageCount + fileCount,
  }
}

export const getCurrentUserId = internalQuery({
  args: {},
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx) => {
    return await getAuthUserId(ctx)
  },
})

export const getAutoModelRoutingState = internalQuery({
  args: {},
  returns: v.object({
    available: v.boolean(),
    routerUrl: v.optional(v.string()),
    routerApiKey: v.optional(v.string()),
    preference: v.optional(autoModelRouterPreferenceValidator),
    models: v.array(
      v.object({
        id: v.id('models'),
        modelId: v.string(),
        displayName: v.string(),
        providerId: v.id('providers'),
        providerName: v.string(),
        capabilities: v.optional(v.array(v.string())),
        contextWindow: v.optional(v.number()),
        intelligence: v.number(),
        price: v.number(),
        speed: v.number(),
        latency: v.number(),
        taskScores: v.object({
          general: v.number(),
          code: v.number(),
          math: v.number(),
          analysis: v.number(),
        }),
        supportsTools: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const settings =
      (await ctx.db
        .query('adminSettings')
        .withIndex('by_key', (q) => q.eq('key', 'global'))
        .first()) ?? null

    const routerUrl = settings?.autoModelRouterUrl?.trim()
    const routerApiKey = settings?.autoModelRouterApiKey?.trim()
    const available =
      settings?.autoModelRoutingEnabled === true && Boolean(routerUrl) && Boolean(routerApiKey)

    const [models, providers, profiles] = await Promise.all([
      ctx.db
        .query('models')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db
        .query('providers')
        .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
        .collect(),
      ctx.db.query('modelSelectionProfiles').collect(),
    ])

    const providerById = new Map(providers.map((provider) => [provider._id, provider]))
    const profileByModelId = new Map(profiles.map((profile) => [profile.modelId, profile]))

    const visibleModels = models
      .filter((model) => providerById.has(model.providerId))
      .map((model) => {
        const provider = providerById.get(model.providerId)!
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
        const supportsTools = (profile?.capabilities ?? model.capabilities ?? [])
          .map((item) => item.toLowerCase())
          .some((item) => item === 'tools' || item === 'tool_calling')

        return {
          id: model._id,
          modelId: model.modelId,
          displayName: model.displayName,
          providerId: provider._id,
          providerName: provider.name,
          capabilities: model.capabilities,
          contextWindow: model.contextWindow,
          intelligence,
          price: estimatedCost,
          speed: clamp01(1 - Math.min(latencyMs / 8000, 1)),
          latency: clamp01(Math.min(latencyMs / 8000, 1)),
          taskScores: normalizeTaskScores(benchmarkScores, intelligence),
          supportsTools,
        }
      })

    const maxPrice = Math.max(...visibleModels.map((model) => model.price), 0.000001)

    return {
      available,
      routerUrl,
      routerApiKey,
      preference: settings?.autoModelRouterPreference ?? 'balanced',
      models: visibleModels.map((model) => ({
        ...model,
        price: clamp01(model.price / maxPrice),
      })),
    }
  },
})

export const recordAutoModelDecision = internalMutation({
  args: {
    decisionId: v.string(),
    userId: v.optional(v.id('users')),
    threadId: v.optional(v.string()),
    selectedModelId: v.optional(v.id('models')),
    selectedModelKey: v.optional(v.string()),
    selectedModelName: v.optional(v.string()),
    selectedProviderId: v.optional(v.id('providers')),
    selectedProviderName: v.optional(v.string()),
    routerUrl: v.optional(v.string()),
    routerPreference: v.optional(autoModelRouterPreferenceValidator),
    requestPreview: v.optional(v.string()),
    requestChars: v.number(),
    searchEnabled: v.boolean(),
    reasoningEnabled: v.boolean(),
    status: v.union(v.literal('success'), v.literal('failed')),
    error: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    createdAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('autoModelDecisions', args)
    return null
  },
})

export const selectAutoModel = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    searchEnabled: v.optional(v.boolean()),
    reasoningEnabled: v.optional(v.boolean()),
    requiresImageInput: v.optional(v.boolean()),
    attachmentSummary: v.optional(
      v.object({
        imageCount: v.number(),
        fileCount: v.number(),
        totalCount: v.number(),
      }),
    ),
  },
  returns: v.object({
    decisionId: v.string(),
    selectedModelDocId: v.id('models'),
    selectedModelId: v.string(),
    selectedModelName: v.string(),
    selectedProviderName: v.string(),
  }),
  handler: async (ctx, args) => {
    const [userId, routingState] = await Promise.all([
      ctx.runQuery(internal.modelRouter.getCurrentUserId, {}),
      ctx.runQuery(internal.modelRouter.getAutoModelRoutingState, {}),
    ])

    if (!routingState.available || !routingState.routerUrl || !routingState.routerApiKey) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'Auto model is not configured',
      })
    }
    const imageEligibleModels =
      args.requiresImageInput === true
        ? routingState.models.filter((model) => supportsImageInput(model.capabilities))
        : []
    const eligibleModels =
      args.requiresImageInput === true
        ? imageEligibleModels.length > 0
          ? imageEligibleModels
          : routingState.models
        : routingState.models

    if (eligibleModels.length === 0) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'No eligible models available for auto routing',
      })
    }

    const decisionId = deterministicDecisionId()
    const createdAt = Date.now()
    const routerBaseUrl = normalizeRouterBaseUrl(routingState.routerUrl)
    if (!routerBaseUrl) {
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: 'Admin auto model router URL is invalid',
      })
    }

    const syncUrl = withPath(routerBaseUrl, '/models/update')
    const routeUrl = withPath(routerBaseUrl, '/route')
    const requestPreview = normalizeRequestPreview(args.prompt)
    const startedAt = Date.now()

    try {
      const syncResponse = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${routingState.routerApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          models: eligibleModels.map((model: (typeof eligibleModels)[number]) => ({
            name: model.modelId,
            intelligence: model.intelligence,
            price: model.price,
            speed: model.speed,
            latency: model.latency,
            task_scores: model.taskScores,
            max_context_tokens: model.contextWindow,
            supports_tools: model.supportsTools,
          })),
        }),
      })

      if (!syncResponse.ok) {
        throw new Error(`Model sync failed with ${syncResponse.status}`)
      }

      const routeResponse = await fetch(routeUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${routingState.routerApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: args.prompt.trim() || 'Attachment-only request',
            },
          ],
          user: {
            preference: routingState.preference ?? 'balanced',
            requires_image_input: args.requiresImageInput === true,
            attachments: {
              image_count: args.attachmentSummary?.imageCount ?? 0,
              file_count: args.attachmentSummary?.fileCount ?? 0,
              total_count: args.attachmentSummary?.totalCount ?? 0,
            },
          },
        }),
      })

      if (!routeResponse.ok) {
        throw new Error(`Route request failed with ${routeResponse.status}`)
      }

      const payload = (await routeResponse.json()) as { model?: string }
      const selectedModel = eligibleModels.find(
        (model: (typeof eligibleModels)[number]) => model.modelId === payload.model,
      )
      if (!selectedModel) {
        throw new Error('Python router returned a model that is not in the active catalog')
      }

      await ctx.runMutation(internal.modelRouter.recordAutoModelDecision, {
        decisionId,
        userId: userId ?? undefined,
        threadId: args.threadId,
        selectedModelId: selectedModel.id,
        selectedModelKey: selectedModel.modelId,
        selectedModelName: selectedModel.displayName,
        selectedProviderId: selectedModel.providerId,
        selectedProviderName: selectedModel.providerName,
        routerUrl: routingState.routerUrl,
        routerPreference: routingState.preference ?? 'balanced',
        requestPreview,
        requestChars: args.prompt.length,
        searchEnabled: args.searchEnabled === true,
        reasoningEnabled: args.reasoningEnabled === true,
        status: 'success',
        latencyMs: Date.now() - startedAt,
        createdAt,
      })

      return {
        decisionId,
        selectedModelDocId: selectedModel.id,
        selectedModelId: selectedModel.modelId,
        selectedModelName: selectedModel.displayName,
        selectedProviderName: selectedModel.providerName,
      }
    } catch (error) {
      await ctx.runMutation(internal.modelRouter.recordAutoModelDecision, {
        decisionId,
        userId: userId ?? undefined,
        threadId: args.threadId,
        routerUrl: routingState.routerUrl,
        routerPreference: routingState.preference ?? 'balanced',
        requestPreview,
        requestChars: args.prompt.length,
        searchEnabled: args.searchEnabled === true,
        reasoningEnabled: args.reasoningEnabled === true,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Auto model routing failed',
        latencyMs: Date.now() - startedAt,
        createdAt,
      })
      throw new ConvexError({
        code: 'FAILED_PRECONDITION',
        message: error instanceof Error ? error.message : 'Auto model routing failed',
      })
    }
  },
})

export const selectAutoModelForPromptMessage = action({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
    searchEnabled: v.optional(v.boolean()),
    reasoningEnabled: v.optional(v.boolean()),
    requiresImageInput: v.optional(v.boolean()),
  },
  returns: v.object({
    decisionId: v.string(),
    selectedModelDocId: v.id('models'),
    selectedModelId: v.string(),
    selectedModelName: v.string(),
    selectedProviderName: v.string(),
  }),
  handler: async (ctx, args) => {
    const [promptMessage] = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
      messageIds: [args.promptMessageId],
    })

    const attachmentSummary = getAttachmentSummaryFromPromptContent(promptMessage?.message?.content)
    const hasImageAttachment = attachmentSummary.imageCount > 0
    const promptText = promptMessage?.text?.trim() || ''

    if (
      !promptMessage ||
      promptMessage.threadId !== args.threadId ||
      promptMessage.message?.role !== 'user' ||
      (!promptText && attachmentSummary.totalCount === 0)
    ) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Prompt message not found',
      })
    }

    return await ctx.runAction(api.modelRouter.selectAutoModel, {
      prompt: promptText || 'Attachment-only request',
      threadId: args.threadId,
      searchEnabled: args.searchEnabled,
      reasoningEnabled: args.reasoningEnabled,
      requiresImageInput: args.requiresImageInput === true || hasImageAttachment,
      attachmentSummary,
    })
  },
})
