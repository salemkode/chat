import { v } from 'convex/values'

export const providerTypeValidator = v.union(
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

export const iconTypeValidator = v.union(
  v.literal('emoji'),
  v.literal('lucide'),
  v.literal('upload'),
)

export const rateLimitPolicyValidator = v.object({
  enabled: v.boolean(),
  scope: v.union(v.literal('global'), v.literal('user')),
  kind: v.union(v.literal('fixed window'), v.literal('token bucket')),
  rate: v.number(),
  period: v.number(),
  capacity: v.optional(v.number()),
  shards: v.optional(v.number()),
})

export const providerConfigValidator = v.object({
  organization: v.optional(v.string()),
  project: v.optional(v.string()),
  headers: v.optional(v.record(v.string(), v.string())),
  queryParams: v.optional(v.record(v.string(), v.string())),
})

export const modalitiesValidator = v.object({
  input: v.array(v.string()),
  output: v.array(v.string()),
})

export const discoveredModelValidator = v.object({
  modelId: v.string(),
  displayName: v.string(),
  description: v.optional(v.string()),
  ownedBy: v.optional(v.string()),
  contextWindow: v.optional(v.number()),
  maxOutputTokens: v.optional(v.number()),
  modalities: v.optional(modalitiesValidator),
})

export const providerCatalogResultValidator = v.object({
  ok: v.boolean(),
  fetchedAt: v.number(),
  providerType: providerTypeValidator,
  source: v.object({
    discoveryMode: v.union(
      v.literal('openai-compatible'),
      v.literal('openrouter'),
      v.literal('anthropic'),
      v.literal('google'),
      v.literal('unsupported'),
    ),
    baseURL: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    note: v.optional(v.string()),
  }),
  modelCount: v.number(),
  models: v.array(discoveredModelValidator),
  error: v.optional(v.string()),
})

export const threadMetadataValidator = v.object({
  _id: v.id('threadMetadata'),
  _creationTime: v.number(),
  threadId: v.string(),
  emoji: v.string(),
  icon: v.optional(v.string()),
  lastLabelUpdateAt: v.number(),
  sectionId: v.optional(v.id('sections')),
  projectId: v.optional(v.id('projects')),
  userId: v.id('users'),
  sortOrder: v.number(),
})
