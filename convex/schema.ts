import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import vectorTables from './agent/vector/tables.js'

export default defineSchema({
  ...authTables,

  // ============================================
  // THREADS - From agent_base, enhanced with user ownership
  // ============================================
  threads: defineTable({
    // User ownership - REQUIRED
    userId: v.id('users'),

    // Thread metadata
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('archived')),

    // Integration with our sections system
    sectionId: v.optional(v.id('sections')),
    emoji: v.optional(v.string()),

    // DEPRECATED from agent_base
    defaultSystemPrompt: v.optional(v.string()),
    parentThreadIds: v.optional(v.array(v.id('threads'))),
    order: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .searchIndex('title', { searchField: 'title', filterFields: ['userId'] }),

  // ============================================
  // MESSAGES - Full agent_base message structure
  // ============================================
  messages: defineTable({
    // User ownership - optional for anonymous threads
    userId: v.optional(v.id('users')),
    threadId: v.id('threads'),

    // Ordering
    order: v.number(),
    stepOrder: v.number(),

    // Embeddings and files
    embeddingId: v.optional(v.id('v1536')), // Will use appropriate vector table
    fileIds: v.optional(v.array(v.id('files'))),

    // Status and errors
    error: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('success'),
      v.literal('failed')
    ),

    // Context on how it was generated
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(
      v.record(v.string(), v.record(v.string(), v.any()))
    ), // Sent to model

    // The result - complex message structure from agent_base
    message: v.optional(v.any()), // vMessage from validators
    // Convenience fields extracted from the message
    tool: v.boolean(), // either tool call (assistant) or tool result (tool)
    text: v.optional(v.string()),

    // Result metadata
    usage: v.optional(v.any()), // vUsage from validators
    providerMetadata: v.optional(
      v.record(v.string(), v.record(v.string(), v.any()))
    ), // Received from model
    sources: v.optional(v.array(v.any())), // vSource
    warnings: v.optional(v.array(v.any())), // vLanguageModelCallWarning
    finishReason: v.optional(v.any()), // vFinishReason

    // Reasoning
    reasoning: v.optional(v.string()),
    reasoningDetails: v.optional(v.any()), // vReasoningDetails

    // DEPRECATED
    id: v.optional(v.string()), // external id, e.g. from Vercel AI SDK
    parentMessageId: v.optional(v.id('messages')),
    stepId: v.optional(v.string()),
    files: v.optional(v.array(v.any())),
  })
    // Allows finding successful visible messages in order
    // Also surface pending messages separately to e.g. stream
    .index('threadId_status_tool_order_stepOrder', [
      'threadId',
      'status',
      'tool',
      'order',
      'stepOrder',
    ])
    // Allows finding messages by user
    .index('by_userId', ['userId'])
    // Allows text search on message content
    .searchIndex('text_search', {
      searchField: 'text',
      filterFields: ['userId', 'threadId'],
    })
    // Allows finding messages by vector embedding id
    .index('embeddingId_threadId', ['embeddingId', 'threadId']),

  // ============================================
  // STREAMING - Real-time message streaming
  // ============================================
  streamingMessages: defineTable({
    // extra metadata?
    userId: v.optional(v.id('users')),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(
      v.record(v.string(), v.record(v.string(), v.any()))
    ), // Sent to model

    // The data format for the deltas
    format: v.optional(
      v.union(v.literal('UIMessageChunk'), v.literal('TextStreamPart'))
    ),

    threadId: v.id('threads'),
    order: v.number(),
    stepOrder: v.number(),

    // Streaming state
    state: v.union(
      v.object({
        kind: v.literal('streaming'),
        lastHeartbeat: v.number(),
        timeoutFnId: v.optional(v.id('_scheduled_functions')),
      }),
      v.object({
        kind: v.literal('finished'),
        endedAt: v.number(),
        cleanupFnId: v.optional(v.id('_scheduled_functions')),
      }),
      v.object({ kind: v.literal('aborted'), reason: v.string() })
    ),
  }).index('threadId_state_order_stepOrder', [
    'threadId',
    'state.kind',
    'order',
    'stepOrder',
  ]),

  streamDeltas: defineTable({
    streamId: v.id('streamingMessages'),
    // the indexes work like: 0 <first> 1 <second> 2 <third> 3 ...
    start: v.number(), // inclusive
    end: v.number(), // exclusive
    parts: v.array(v.any()),
  }).index('streamId_start_end', ['streamId', 'start', 'end']),

  // ============================================
  // MEMORIES - Optional RAG support
  // ============================================
  memories: defineTable({
    threadId: v.optional(v.id('threads')),
    userId: v.optional(v.id('users')),
    memory: v.string(),
    embeddingId: v.optional(v.id('v1536')),
  })
    .index('threadId', ['threadId'])
    .index('userId', ['userId'])
    .index('embeddingId', ['embeddingId']),

  // ============================================
  // FILES - File storage with refcount
  // ============================================
  files: defineTable({
    storageId: v.string(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
    hash: v.string(),
    refcount: v.number(),
    lastTouchedAt: v.number(),
  })
    .index('hash', ['hash'])
    .index('refcount', ['refcount']),

  // ============================================
  // VECTOR TABLES - For embeddings and search
  // ============================================
  ...vectorTables,

  // ============================================
  // EXISTING TABLES - Keep as-is
  // ============================================

  // Admin-managed AI models
  models: defineTable({
    modelId: v.string(), // e.g., "openai/gpt-4o"
    displayName: v.string(), // e.g., "GPT-4o"
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
  }).index('by_enabled', ['isEnabled']),

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

  // ============================================
  // Thread metadata - Stores extended metadata for threads
  // ============================================
  threadMetadata: defineTable({
    threadId: v.string(), // ID from agent threads
    emoji: v.string(),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    sectionId: v.optional(v.id('sections')),
    userId: v.id('users'),
    mode: v.optional(v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create')
    )),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    isPinned: v.optional(v.boolean()),
    messageCount: v.optional(v.number()),
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_threadId', ['threadId']),
})

// Export for use with convex-helpers utilities
export const schemaDefinition = {
  threads,
  messages,
  streamingMessages,
  streamDeltas,
  memories,
  files,
  models,
  admins,
  sections,
  threadMetadata,
}
