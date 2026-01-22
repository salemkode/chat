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

  // Admin-managed AI models
  models: defineTable({
    modelId: v.string(),
    displayName: v.string(),
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
    entityId: v.string(), // ID of the affected entity
    entityType: v.string(), // e.g., "thread", "project"
    metadata: v.any(),
    timestamp: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_entity', ['entityType', 'entityId']),
})
