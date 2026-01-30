import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

export default defineSchema({
  ...authTables,
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
    ),
    sortOrder: v.float64(),
    // Icon for the provider (used in model selector sidebar)
    icon: v.optional(v.string()), // e.g., "openai", "anthropic", "google", "meta"
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

  // Thread metadata (emoji, sectionId) linked to agent threads
  threadMetadata: defineTable({
    threadId: v.string(), // ID from @convex-dev/agent threads table
    emoji: v.string(),
    sectionId: v.optional(v.id('sections')),
    userId: v.id('users'),
    sortOrder: v.number(), // 1 = pinned, 0 = normal
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_threadId', ['threadId'])
    .index('by_userId_sortOrder', ['userId', 'sortOrder']),

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
    embedding: v.array(v.number()),
    source: v.union(
      v.literal('manual'),
      v.literal('extracted'),
      v.literal('system'),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_updated', ['updatedAt'])
    .index('by_category', ['userId', 'category'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['userId', 'source', 'category'],
    }),

  // NEW: Thread-specific memories
  threadMemories: defineTable({
    threadId: v.string(),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    embedding: v.array(v.number()),
    source: v.union(v.literal('session'), v.literal('manual')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_thread', ['threadId'])
    .index('by_user', ['userId'])
    .index('by_updated', ['updatedAt'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['userId', 'threadId', 'source'],
    }),

  // NEW: Project memories (custom groups)
  projectMemories: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    embedding: v.array(v.number()),
    source: v.union(v.literal('manual'), v.literal('aggregated')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId'])
    .index('by_updated', ['updatedAt'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['userId', 'projectId', 'category'],
    }),

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
})
