import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import vectorTables from './vectorTables.js'

const schema = defineSchema({
  ...authTables,

  // ============================================================================
  // CONVEX AGENT TABLES
  // ============================================================================

  // Threads table for managing conversations
  threads: defineTable({
    userId: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('archived')),
    defaultSystemPrompt: v.optional(v.string()),
    parentThreadIds: v.optional(v.array(v.id('threads'))),
    order: v.optional(v.number()),
  })
    .index('userId', ['userId'])
    .searchIndex('title', { searchField: 'title', filterFields: ['userId'] }),

  // Messages table for storing chat messages
  messages: defineTable({
    userId: v.optional(v.string()),
    threadId: v.id('threads'),
    order: v.number(),
    stepOrder: v.number(),
    embeddingId: v.optional(
      v.union(
        v.id('embeddings_128'),
        v.id('embeddings_256'),
        v.id('embeddings_512'),
        v.id('embeddings_768'),
        v.id('embeddings_1024'),
        v.id('embeddings_1408'),
        v.id('embeddings_1536'),
        v.id('embeddings_2048'),
        v.id('embeddings_3072'),
        v.id('embeddings_4096'),
      ),
    ),
    fileIds: v.optional(v.array(v.id('files'))),
    error: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('success'),
      v.literal('failed'),
    ),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(
      v.record(v.string(), v.record(v.string(), v.any())),
    ),
    message: v.optional(
      v.union(
        v.object({
          role: v.literal('system'),
          content: v.string(),
          providerOptions: v.optional(
            v.record(v.string(), v.record(v.string(), v.any())),
          ),
        }),
        v.object({
          role: v.literal('user'),
          content: v.union(
            v.string(),
            v.array(
              v.union(
                v.object({
                  type: v.literal('text'),
                  text: v.string(),
                  providerOptions: v.optional(
                    v.record(v.string(), v.record(v.string(), v.any())),
                  ),
                  providerMetadata: v.optional(
                    v.record(v.string(), v.record(v.string(), v.any())),
                  ),
                }),
                v.object({
                  type: v.literal('image'),
                  image: v.union(v.string(), v.bytes()),
                  mimeType: v.optional(v.string()),
                  providerOptions: v.optional(
                    v.record(v.string(), v.record(v.string(), v.any())),
                  ),
                }),
                v.object({
                  type: v.literal('file'),
                  data: v.union(v.string(), v.bytes()),
                  filename: v.optional(v.string()),
                  mimeType: v.string(),
                  providerOptions: v.optional(
                    v.record(v.string(), v.record(v.string(), v.any())),
                  ),
                  providerMetadata: v.optional(
                    v.record(v.string(), v.record(v.string(), v.any())),
                  ),
                }),
              ),
            ),
          ),
          providerOptions: v.optional(
            v.record(v.string(), v.record(v.string(), v.any())),
          ),
        }),
        v.object({
          role: v.literal('assistant'),
          content: v.union(v.string(), v.array(v.any())),
          providerOptions: v.optional(
            v.record(v.string(), v.record(v.string(), v.any())),
          ),
        }),
        v.object({
          role: v.literal('tool'),
          content: v.array(v.any()),
          providerOptions: v.optional(
            v.record(v.string(), v.record(v.string(), v.any())),
          ),
        }),
      ),
    ),
    tool: v.boolean(),
    text: v.optional(v.string()),
    usage: v.optional(
      v.object({
        promptTokens: v.number(),
        completionTokens: v.number(),
        totalTokens: v.number(),
        reasoningTokens: v.optional(v.number()),
        cachedInputTokens: v.optional(v.number()),
      }),
    ),
    providerMetadata: v.optional(
      v.record(v.string(), v.record(v.string(), v.any())),
    ),
    sources: v.optional(
      v.array(
        v.union(
          v.object({
            type: v.optional(v.literal('source')),
            sourceType: v.literal('url'),
            id: v.string(),
            url: v.string(),
            title: v.optional(v.string()),
            providerOptions: v.optional(
              v.record(v.string(), v.record(v.string(), v.any())),
            ),
            providerMetadata: v.optional(
              v.record(v.string(), v.record(v.string(), v.any())),
            ),
          }),
          v.object({
            type: v.literal('source'),
            sourceType: v.literal('document'),
            id: v.string(),
            mediaType: v.string(),
            title: v.string(),
            filename: v.optional(v.string()),
            providerOptions: v.optional(
              v.record(v.string(), v.record(v.string(), v.any())),
            ),
            providerMetadata: v.optional(
              v.record(v.string(), v.record(v.string(), v.any())),
            ),
          }),
        ),
      ),
    ),
    warnings: v.optional(
      v.array(
        v.union(
          v.object({
            type: v.literal('unsupported-setting'),
            setting: v.string(),
            details: v.optional(v.string()),
          }),
          v.object({
            type: v.literal('unsupported-tool'),
            tool: v.any(),
            details: v.optional(v.string()),
          }),
          v.object({ type: v.literal('other'), message: v.string() }),
        ),
      ),
    ),
    finishReason: v.optional(
      v.union(
        v.literal('stop'),
        v.literal('length'),
        v.literal('content-filter'),
        v.literal('tool-calls'),
        v.literal('error'),
        v.literal('other'),
        v.literal('unknown'),
      ),
    ),
    reasoning: v.optional(v.string()),
    reasoningDetails: v.optional(
      v.array(
        v.union(
          v.object({
            type: v.literal('reasoning'),
            text: v.string(),
            signature: v.optional(v.string()),
            providerOptions: v.optional(
              v.record(v.string(), v.record(v.string(), v.any())),
            ),
            providerMetadata: v.optional(
              v.record(v.string(), v.record(v.string(), v.any())),
            ),
          }),
          v.object({
            type: v.literal('text'),
            text: v.string(),
            signature: v.optional(v.string()),
          }),
          v.object({ type: v.literal('redacted'), data: v.string() }),
        ),
      ),
    ),
    id: v.optional(v.string()),
    parentMessageId: v.optional(v.id('messages')),
    stepId: v.optional(v.string()),
    files: v.optional(v.array(v.any())),
  })
    .index('threadId_status_tool_order_stepOrder', [
      'threadId',
      'status',
      'tool',
      'order',
      'stepOrder',
    ])
    .searchIndex('text_search', {
      searchField: 'text',
      filterFields: ['userId', 'threadId'],
    })
    .index('embeddingId_threadId', ['embeddingId', 'threadId']),

  // Streaming messages for real-time updates
  streamingMessages: defineTable({
    userId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(
      v.record(v.string(), v.record(v.string(), v.any())),
    ),
    format: v.optional(
      v.union(v.literal('UIMessageChunk'), v.literal('TextStreamPart')),
    ),
    threadId: v.id('threads'),
    order: v.number(),
    stepOrder: v.number(),
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
      v.object({ kind: v.literal('aborted'), reason: v.string() }),
    ),
  }).index('threadId_state_order_stepOrder', [
    'threadId',
    'state.kind',
    'order',
    'stepOrder',
  ]),

  // Stream deltas for storing partial message chunks
  streamDeltas: defineTable({
    streamId: v.id('streamingMessages'),
    start: v.number(),
    end: v.number(),
    parts: v.array(v.any()),
  }).index('streamId_start_end', ['streamId', 'start', 'end']),

  // Files table for managing file storage
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

  // API keys for playground authentication
  apiKeys: defineTable({ name: v.optional(v.string()) }).index('name', [
    'name',
  ]),

  // Vector tables for embeddings
  ...vectorTables,

  // ============================================================================
  // EXISTING PROJECT TABLES
  // ============================================================================

  // AI providers (OpenAI, Anthropic, Custom, etc.)
  providers: defineTable({
    name: v.string(),
    providerType: v.string(),
    apiKey: v.string(),
    baseURL: v.optional(v.string()),
    isEnabled: v.boolean(),
    sortOrder: v.number(),
  })
    .index('by_enabled', ['isEnabled'])
    .index('by_type', ['providerType']),

  // Admin-managed AI models
  models: defineTable({
    modelId: v.string(),
    displayName: v.string(),
    providerId: v.optional(v.id('providers')),
    isEnabled: v.boolean(),
    isFree: v.boolean(),
    sortOrder: v.number(),
  })
    .index('by_enabled', ['isEnabled'])
    .index('by_provider', ['providerId']),

  // Admin users
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

  // Thread metadata (emoji, sectionId, projectId) linked to agent threads
  threadMetadata: defineTable({
    threadId: v.string(),
    emoji: v.string(),
    sectionId: v.optional(v.id('sections')),
    userId: v.id('users'),
    projectId: v.optional(v.id('projects')),
    title: v.string(),
    mode: v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create'),
    ),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    metadata: v.object({
      messageCount: v.number(),
      lastModel: v.optional(v.string()),
      isPinned: v.boolean(),
    }),
  })
    .index('by_userId', ['userId'])
    .index('by_sectionId', ['sectionId'])
    .index('by_threadId', ['threadId'])
    .index('by_userId_project', ['userId', 'projectId'])
    .index('by_userId_lastActive', ['userId', 'lastActiveAt'])
    .index('by_project', ['projectId']),

  // Projects table
  projects: defineTable({
    userId: v.id('users'),
    name: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.number(),
    archivedAt: v.optional(v.number()),
    metadata: v.object({
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      color: v.optional(v.string()),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_user_archived', ['userId', 'archivedAt'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['userId', 'archivedAt'],
    }),

  // Memory entries with vector index
  memories: defineTable({
    userId: v.id('users'),
    scope: v.union(
      v.literal('profile'),
      v.literal('skill'),
      v.literal('project'),
      v.literal('thread'),
      v.literal('pinned'),
    ),
    scopeId: v.optional(v.string()),
    content: v.string(),
    embedding: v.array(v.float64()),
    relevanceScore: v.float64(),
    recencyScore: v.float64(),
    importanceScore: v.float64(),
    createdAt: v.number(),
    updatedAt: v.number(),
    metadata: v.object({
      source: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
    }),
  })
    .index('by_user_scope', ['userId', 'scope'])
    .index('by_user_scope_id', ['userId', 'scope', 'scopeId'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['userId', 'scope', 'scopeId'],
    }),

  // Project mentions (tracking @Project usage)
  projectMentions: defineTable({
    userId: v.string(),
    threadId: v.string(),
    projectId: v.id('projects'),
    messageId: v.string(),
    mentionedAt: v.number(),
    attachmentOffered: v.boolean(),
    attachmentAccepted: v.optional(v.boolean()),
  })
    .index('by_thread', ['threadId'])
    .index('by_thread_project', ['threadId', 'projectId']),

  // Audit logs for important actions
  auditLogs: defineTable({
    userId: v.id('users'),
    action: v.string(),
    entityId: v.string(),
    entityType: v.string(),
    metadata: v.any(),
    timestamp: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_entity', ['entityType', 'entityId']),
})

export default schema
