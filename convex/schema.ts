import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { appPlanValidator } from './lib/appPlan'

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

const modalitiesValidator = v.object({
  input: v.array(v.string()),
  output: v.array(v.string()),
})

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    clerkUserId: v.optional(v.string()),
    appPlan: v.optional(appPlanValidator),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('clerkUserId', ['clerkUserId']),

  messages: defineTable({
    body: v.string(),
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
  }).index('by_userId', ['userId']),

  providers: defineTable({
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
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
      v.literal('cerebras'),
      v.literal('openai-compatible'), // Generic OpenAI-compatible provider (OpenCode, etc.)
      v.literal('opencode'), // OpenCode.ai provider
      v.literal('mistral'),
      v.literal('cohere'),
      v.literal('perplexity'),
      v.literal('fireworks'),
      v.literal('together'),
      v.literal('replicate'),
      v.literal('moonshot'),
      v.literal('qwen'),
      v.literal('stepfun'),
    ),
    sortOrder: v.float64(),
    // Icon for the provider (used in model selector sidebar)
    icon: v.optional(v.string()), // e.g., "openai", "anthropic", "google", "meta"
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')), // Uploaded image ID
    rateLimit: v.optional(rateLimitPolicyValidator),
    lastDiscoveredAt: v.optional(v.number()),
    lastDiscoveryError: v.optional(v.string()),
    lastDiscoveredModelCount: v.optional(v.number()),
    // Provider-specific configuration
    config: v.optional(
      v.object({
        // Organization ID for OpenAI
        organization: v.optional(v.string()),
        // Project ID for OpenAI
        project: v.optional(v.string()),
        // Headers to include in requests
        headers: v.optional(v.record(v.string(), v.string())),
        // Query parameters
        queryParams: v.optional(v.record(v.string(), v.string())),
      }),
    ),
  })
    .index('by_enabled', ['isEnabled'])
    .index('by_providerType', ['providerType']),

  // Admin-managed AI models
  models: defineTable({
    modelId: v.string(), // e.g., "openai/gpt-4o"
    displayName: v.string(), // e.g., "GPT-4o"
    description: v.optional(v.string()), // e.g., "Lightning-fast with surprising capability"
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
    providerId: v.id('providers'),
    icon: v.optional(v.string()), // Fallback string icon
    iconType: v.optional(iconTypeValidator),
    iconId: v.optional(v.id('_storage')), // Uploaded image ID
    // Model capabilities/tags
    capabilities: v.optional(v.array(v.string())), // e.g., ["reasoning", "vision", "code"]
    ownedBy: v.optional(v.string()),
    contextWindow: v.optional(v.number()),
    maxOutputTokens: v.optional(v.number()),
    modalities: v.optional(modalitiesValidator),
    rateLimit: v.optional(rateLimitPolicyValidator),
    discoveredAt: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
  })
    .index('by_enabled', ['isEnabled'])
    .index('by_providerId', ['providerId']),

  modelCollections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    modelIds: v.array(v.id('models')),
  }).index('by_sortOrder', ['sortOrder']),

  // User's favorite models
  userFavoriteModels: defineTable({
    userId: v.id('users'),
    modelId: v.id('models'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_model', ['userId', 'modelId']),

  // Admin users (simple approach)
  admins: defineTable({
    userId: v.id('users'),
  }).index('by_userId', ['userId']),

  adminSettings: defineTable({
    key: v.string(),
    appPlan: appPlanValidator,
    defaultRateLimit: v.optional(rateLimitPolicyValidator),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  modelUsageEvents: defineTable({
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
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_model_createdAt', ['modelId', 'createdAt'])
    .index('by_provider_createdAt', ['providerId', 'createdAt'])
    .index('by_user_createdAt', ['userId', 'createdAt']),

  // Chat sections (folders) for organizing threads
  sections: defineTable({
    name: v.string(),
    emoji: v.string(),
    sortOrder: v.number(),
    userId: v.id('users'),
    isExpanded: v.boolean(),
  }).index('by_userId', ['userId']),

  // Thread metadata (emoji/icon, sectionId) linked to agent threads
  threadMetadata: defineTable({
    threadId: v.string(), // ID from @convex-dev/agent threads table
    emoji: v.string(),
    icon: v.optional(v.string()), // Lucide icon name
    lastLabelUpdateAt: v.number(),
    sectionId: v.optional(v.id('sections')),
    projectId: v.optional(v.id('projects')),
    userId: v.id('users'),
    sortOrder: v.number(), // 1 = pinned, 0 = normal
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_projectId', ['projectId'])
    .index('by_threadId', ['threadId'])
    .index('by_userId_sortOrder', ['userId', 'sortOrder']),

  // Public share snapshots for chat transcripts
  chatShares: defineTable({
    threadId: v.string(),
    ownerUserId: v.id('users'),
    token: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    messageCount: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_thread_owner', ['threadId', 'ownerUserId']),

  chatShareMessages: defineTable({
    shareId: v.id('chatShares'),
    order: v.number(),
    role: v.union(v.literal('user'), v.literal('assistant')),
    text: v.string(),
  }).index('by_share_order', ['shareId', 'order']),

  // Memory system: Files metadata
  memoryFiles: defineTable({
    path: v.string(),
    source: v.union(v.literal('memory'), v.literal('sessions')),
    hash: v.string(),
    mtime: v.number(),
    size: v.number(),
    agentId: v.string(),
    lastSyncedAt: v.optional(v.number()),
  })
    .index('by_path', ['path', 'agentId'])
    .index('by_source', ['source', 'agentId'])
    .index('by_agent', ['agentId'])
    .index('by_mtime', ['mtime']),

  // Memory system: Text chunks with embeddings
  memoryChunks: defineTable({
    path: v.string(),
    source: v.union(v.literal('memory'), v.literal('sessions')),
    startLine: v.number(),
    endLine: v.number(),
    hash: v.string(),
    model: v.string(),
    text: v.string(),
    embedding: v.array(v.number()),
    updatedAt: v.number(),
    agentId: v.string(),
    fileId: v.id('memoryFiles'),
  })
    .index('by_file', ['fileId'])
    .index('by_path', ['path', 'agentId'])
    .index('by_source', ['source', 'agentId'])
    .index('by_updated', ['updatedAt'])
    .index('by_agent', ['agentId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['agentId', 'model', 'source'],
    }),

  // Memory system: Embedding cache
  memoryEmbeddingCache: defineTable({
    provider: v.string(),
    model: v.string(),
    providerKey: v.string(),
    hash: v.string(),
    embedding: v.array(v.number()),
    dims: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_composite', ['provider', 'model', 'providerKey', 'hash'])
    .index('by_updated', ['updatedAt']),

  // Memory system: Metadata
  memoryMeta: defineTable({
    key: v.string(),
    value: v.string(),
    agentId: v.string(),
  }).index('by_key', ['key', 'agentId']),

  // Memory system: Sync state
  memorySyncState: defineTable({
    agentId: v.string(),
    lastFullSync: v.number(),
    pendingFiles: v.array(v.string()),
    dirty: v.boolean(),
    error: v.optional(v.string()),
  }).index('by_agent', ['agentId']),

  // NEW: User-level memories (general knowledge, preferences)
  userMemories: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ragKey: v.string(),
    contentHash: v.string(),
    embedding: v.optional(v.array(v.number())),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(
      v.literal('manual'),
      v.literal('extracted'),
      v.literal('system'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_contentHash', ['userId', 'contentHash'])
    .index('by_user_updated', ['userId', 'updatedAt']),

  // NEW: Thread-specific memories
  threadMemories: defineTable({
    threadId: v.string(),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ragKey: v.string(),
    contentHash: v.string(),
    embedding: v.optional(v.array(v.number())),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(v.literal('session'), v.literal('manual')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_thread', ['threadId'])
    .index('by_user', ['userId'])
    .index('by_thread_contentHash', ['threadId', 'contentHash'])
    .index('by_thread_updated', ['threadId', 'updatedAt']),

  // NEW: Project memories (custom groups)
  projectMemories: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ragKey: v.string(),
    contentHash: v.string(),
    embedding: v.optional(v.array(v.number())),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(v.literal('manual'), v.literal('aggregated')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId'])
    .index('by_project_contentHash', ['projectId', 'contentHash'])
    .index('by_project_updated', ['projectId', 'updatedAt']),

  // NEW: Projects table (for grouping threads)
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id('users'),
    threadIds: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_updated', ['updatedAt']),

  // NEW: Memory sync state (per user)
  memoryState: defineTable({
    userId: v.id('users'),
    lastSyncAt: v.number(),
    status: v.union(
      v.literal('idle'),
      v.literal('syncing'),
      v.literal('error'),
    ),
    errorMessage: v.optional(v.string()),
  }).index('by_user', ['userId']),

  memoryExtractionState: defineTable({
    threadId: v.string(),
    userId: v.id('users'),
    lastProcessedOrder: v.number(),
    updatedAt: v.number(),
    status: v.optional(
      v.union(v.literal('idle'), v.literal('running'), v.literal('error')),
    ),
    error: v.optional(v.string()),
  })
    .index('by_thread', ['threadId'])
    .index('by_user', ['userId']),

  // User settings and profile
  userSettings: defineTable({
    userId: v.id('users'),
    displayName: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),
})
