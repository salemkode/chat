import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

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
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('email', ['email'])
    .index('phone', ['phone']),

  messages: defineTable({
    body: v.string(),
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
  }).index('by_userId', ['userId']),

  providers: defineTable({
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
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
    iconId: v.optional(v.id('_storage')), // Uploaded image ID
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
    iconId: v.optional(v.id('_storage')), // Uploaded image ID
    // Model capabilities/tags
    capabilities: v.optional(v.array(v.string())), // e.g., ["reasoning", "vision", "code"]
  })
    .index('by_enabled', ['isEnabled'])
    .index('by_providerId', ['providerId']),

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
    sectionId: v.optional(v.id('sections')),
    userId: v.id('users'),
    sortOrder: v.number(), // 1 = pinned, 0 = normal
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_threadId', ['threadId'])
    .index('by_userId_sortOrder', ['userId', 'sortOrder']),

  // Offline mirror for thread metadata and index sync.
  chatThreads: defineTable({
    userId: v.id('users'),
    remoteThreadId: v.string(),
    title: v.string(),
    emoji: v.string(),
    icon: v.optional(v.string()),
    pinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
    deletedAt: v.optional(v.number()),
    version: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_remoteThreadId', ['userId', 'remoteThreadId'])
    .index('by_user_version', ['userId', 'version']),

  // Offline mirror for message history sync.
  chatMessages: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    remoteMessageId: v.string(),
    role: v.union(v.literal('user'), v.literal('assistant')),
    text: v.string(),
    partsJson: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
    version: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_thread', ['threadId'])
    .index('by_thread_version', ['threadId', 'version'])
    .index('by_user_remoteMessageId', ['userId', 'remoteMessageId']),

  offlineSyncState: defineTable({
    userId: v.id('users'),
    lastFullSyncAt: v.optional(v.number()),
    lastDeltaSyncAt: v.optional(v.number()),
    schemaVersion: v.number(),
  }).index('by_user', ['userId']),

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
