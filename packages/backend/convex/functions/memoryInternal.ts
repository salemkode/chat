import { internalAction, internalMutation, internalQuery } from '../_generated/server'
import { v, ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import { components, internal } from '../_generated/api'
import { memoryRag } from './memoryRag'
import {
  buildRagFilterValues,
  buildRagKey,
  formatMemory,
  hashMemoryContent,
  memoryScopeValidator,
  mergeStringLists,
  normalizeMemoryContent,
  normalizeOptionalString,
  normalizeTags,
  scopeToTable,
  userMemorySourceValidator,
} from './memoryShared'
import { requireProjectRole } from '../lib/projectAccess'

type UserMemoryDoc = Doc<'userMemories'>
type ThreadMemoryDoc = Doc<'threadMemories'>
type ProjectMemoryDoc = Doc<'projectMemories'>
type UserMemorySource = UserMemoryDoc['source']
type ThreadMemorySource = ThreadMemoryDoc['source']
type ProjectMemorySource = ProjectMemoryDoc['source']

function toThreadMemorySource(source: UserMemorySource): ThreadMemorySource {
  switch (source) {
    case 'manual':
      return 'manual'
    case 'system':
      return 'manual'
    case 'extracted':
      return 'session'
  }
}

function toProjectMemorySource(source: UserMemorySource): ProjectMemorySource {
  switch (source) {
    case 'manual':
      return 'manual'
    case 'system':
      return 'manual'
    case 'extracted':
      return 'aggregated'
  }
}

function assertScopeTarget(args: {
  scope: 'user' | 'thread' | 'project'
  threadId?: string
  projectId?: Id<'projects'>
}) {
  if (args.scope === 'thread' && !args.threadId) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'threadId is required for thread memories',
    })
  }

  if (args.scope === 'project' && !args.projectId) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'projectId is required for project memories',
    })
  }
}

function getMetadata(args: {
  scope: 'user' | 'thread' | 'project'
  memoryId: string
  category?: string
  source: string
}) {
  return {
    scope: args.scope,
    memoryId: args.memoryId,
    source: args.source,
    ...(args.category ? { category: args.category } : {}),
  }
}

export const findUserMemoryByContentHash = internalQuery({
  args: {
    userId: v.id('users'),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userMemories')
      .withIndex('by_user_contentHash', (q) =>
        q.eq('userId', args.userId).eq('contentHash', args.contentHash),
      )
      .unique()
  },
})

export const findThreadMemoryByContentHash = internalQuery({
  args: {
    threadId: v.string(),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('threadMemories')
      .withIndex('by_thread_contentHash', (q) =>
        q.eq('threadId', args.threadId).eq('contentHash', args.contentHash),
      )
      .unique()
  },
})

export const findProjectMemoryByContentHash = internalQuery({
  args: {
    projectId: v.id('projects'),
    contentHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('projectMemories')
      .withIndex('by_project_contentHash', (q) =>
        q.eq('projectId', args.projectId).eq('contentHash', args.contentHash),
      )
      .unique()
  },
})

export const insertUserMemory = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ragKey: v.string(),
    contentHash: v.string(),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: userMemorySourceValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('userMemories', args)
  },
})

export const insertThreadMemory = internalMutation({
  args: {
    threadId: v.string(),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ragKey: v.string(),
    contentHash: v.string(),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(v.literal('manual'), v.literal('session')),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('threadMemories', args)
  },
})

export const insertProjectMemory = internalMutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    ragKey: v.string(),
    contentHash: v.string(),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(v.literal('manual'), v.literal('aggregated')),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('projectMemories', args)
  },
})

export const patchUserMemory = internalMutation({
  args: {
    memoryId: v.id('userMemories'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    contentHash: v.string(),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: userMemorySourceValidator,
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, {
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      contentHash: args.contentHash,
      originThreadId: args.originThreadId,
      originMessageIds: args.originMessageIds,
      source: args.source,
      updatedAt: args.updatedAt,
    })
  },
})

export const patchThreadMemory = internalMutation({
  args: {
    memoryId: v.id('threadMemories'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    contentHash: v.string(),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(v.literal('manual'), v.literal('session')),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, {
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      contentHash: args.contentHash,
      originThreadId: args.originThreadId,
      originMessageIds: args.originMessageIds,
      source: args.source,
      updatedAt: args.updatedAt,
    })
  },
})

export const patchProjectMemory = internalMutation({
  args: {
    memoryId: v.id('projectMemories'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    contentHash: v.string(),
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
    source: v.union(v.literal('manual'), v.literal('aggregated')),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, {
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      contentHash: args.contentHash,
      originThreadId: args.originThreadId,
      originMessageIds: args.originMessageIds,
      source: args.source,
      updatedAt: args.updatedAt,
    })
  },
})

export const deleteUserMemoryRecord = internalMutation({
  args: { memoryId: v.id('userMemories') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memoryId)
  },
})

export const deleteThreadMemoryRecord = internalMutation({
  args: { memoryId: v.id('threadMemories') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memoryId)
  },
})

export const deleteProjectMemoryRecord = internalMutation({
  args: { memoryId: v.id('projectMemories') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.memoryId)
  },
})

export const getUserMemoriesByIds = internalQuery({
  args: {
    ids: v.array(v.id('userMemories')),
  },
  handler: async (ctx, args) => {
    const memories = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return memories.filter((memory): memory is UserMemoryDoc => memory !== null)
  },
})

export const getThreadMemoriesByIds = internalQuery({
  args: {
    ids: v.array(v.id('threadMemories')),
  },
  handler: async (ctx, args) => {
    const memories = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return memories.filter((memory): memory is ThreadMemoryDoc => memory !== null)
  },
})

export const getProjectMemoriesByIds = internalQuery({
  args: {
    ids: v.array(v.id('projectMemories')),
  },
  handler: async (ctx, args) => {
    const memories = await Promise.all(args.ids.map((id) => ctx.db.get(id)))
    return memories.filter((memory): memory is ProjectMemoryDoc => memory !== null)
  },
})

export const getUserMemoryById = internalQuery({
  args: {
    id: v.id('userMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getThreadMemoryById = internalQuery({
  args: {
    id: v.id('threadMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getProjectMemoryById = internalQuery({
  args: {
    id: v.id('projectMemories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

export const getProjectById = internalQuery({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId)
  },
})

export const hasProjectAccessForUser = internalQuery({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    minimumRole: v.optional(v.union(v.literal('owner'), v.literal('editor'), v.literal('viewer'))),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    try {
      await requireProjectRole(ctx, {
        projectId: args.projectId,
        userId: args.userId,
        minimumRole: args.minimumRole ?? 'viewer',
      })
      return true
    } catch {
      return false
    }
  },
})

export const getExtractionStateByThread = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('memoryExtractionState')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .unique()
  },
})

export const upsertExtractionState = internalMutation({
  args: {
    threadId: v.string(),
    userId: v.id('users'),
    lastProcessedOrder: v.number(),
    updatedAt: v.number(),
    status: v.optional(v.union(v.literal('idle'), v.literal('running'), v.literal('error'))),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('memoryExtractionState')
      .withIndex('by_thread', (q) => q.eq('threadId', args.threadId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        lastProcessedOrder: args.lastProcessedOrder,
        updatedAt: args.updatedAt,
        status: args.status,
        error: args.error,
      })
      return existing._id
    }

    return await ctx.db.insert('memoryExtractionState', args)
  },
})

export const listProjectsForThread = internalQuery({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata || metadata.userId !== args.userId || !metadata.projectId) {
      return []
    }

    const project = await ctx.db.get(metadata.projectId)
    if (!project) {
      return []
    }

    try {
      await requireProjectRole(ctx, {
        projectId: project._id,
        userId: args.userId,
        minimumRole: 'viewer',
      })
    } catch {
      return []
    }

    return [project]
  },
})

export const getProjectForThread = internalQuery({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata || metadata.userId !== args.userId || !metadata.projectId) {
      return null
    }

    const project = await ctx.db.get(metadata.projectId)
    if (!project) {
      return null
    }

    try {
      await requireProjectRole(ctx, {
        projectId: project._id,
        userId: args.userId,
        minimumRole: 'viewer',
      })
    } catch {
      return null
    }

    return project
  },
})

export const createMemoryInScope = internalAction({
  args: {
    scope: memoryScopeValidator,
    userId: v.id('users'),
    threadId: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: userMemorySourceValidator,
    originThreadId: v.optional(v.string()),
    originMessageIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    assertScopeTarget(args)

    const title = normalizeOptionalString(args.title) ?? 'Untitled memory'
    const content = normalizeMemoryContent(args.content)
    const category = normalizeOptionalString(args.category)
    const tags = normalizeTags(args.tags)
    const originThreadId = normalizeOptionalString(args.originThreadId)
    const originMessageIds = args.originMessageIds?.filter(Boolean)
    const contentHash = await hashMemoryContent(content)
    const now = Date.now()

    if (args.scope !== 'user' && args.source === 'system') {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'system source is only supported for user memories',
      })
    }

    if (args.scope === 'user') {
      const existing = await ctx.runQuery(
        internal.functions.memoryInternal.findUserMemoryByContentHash,
        {
          userId: args.userId,
          contentHash,
        },
      )

      const memoryId =
        existing?._id ??
        (await ctx.runMutation(internal.functions.memoryInternal.insertUserMemory, {
          userId: args.userId,
          title,
          content,
          category,
          tags,
          ragKey: '',
          contentHash,
          originThreadId,
          originMessageIds,
          source: args.source,
          createdAt: now,
          updatedAt: now,
        }))

      const ragKey = existing?.ragKey ?? buildRagKey('user', memoryId.toString())

      if (existing) {
        await ctx.runMutation(internal.functions.memoryInternal.patchUserMemory, {
          memoryId: existing._id,
          title,
          content,
          category: category ?? existing.category,
          tags: mergeStringLists(existing.tags, tags),
          contentHash,
          originThreadId: originThreadId ?? existing.originThreadId,
          originMessageIds: mergeStringLists(existing.originMessageIds, originMessageIds),
          source:
            existing.source === 'manual' && args.source === 'extracted'
              ? existing.source
              : args.source,
          updatedAt: now,
        })
      } else {
        await ctx.runMutation(internal.functions.memoryInternal.patchUserMemoryRagKey, {
          memoryId: memoryId as Id<'userMemories'>,
          ragKey,
        })
        await ctx.runMutation(internal.functions.memoryInternal.patchUserMemory, {
          memoryId: memoryId as Id<'userMemories'>,
          title,
          content,
          category,
          tags,
          contentHash,
          originThreadId,
          originMessageIds,
          source: args.source,
          updatedAt: now,
        })
      }

      await memoryRag.add(ctx, {
        namespace: args.userId,
        key: ragKey,
        title,
        text: content,
        filterValues: buildRagFilterValues({
          userId: args.userId,
          threadId: null,
          projectId: null,
        }),
        metadata: getMetadata({
          scope: 'user',
          memoryId: memoryId.toString(),
          category,
          source:
            existing?.source === 'manual' && args.source === 'extracted'
              ? existing.source
              : args.source,
        }),
        contentHash,
      })

      const memory = await ctx.runQuery(internal.functions.memoryInternal.getUserMemoryById, {
        id: memoryId as Id<'userMemories'>,
      })

      if (!memory) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Failed to create memory',
        })
      }

      return formatMemory('user', memory)
    }

    if (args.scope === 'thread') {
      const threadId = args.threadId!
      const existing = await ctx.runQuery(
        internal.functions.memoryInternal.findThreadMemoryByContentHash,
        {
          threadId,
          contentHash,
        },
      )

      const memoryId =
        existing?._id ??
        (await ctx.runMutation(internal.functions.memoryInternal.insertThreadMemory, {
          threadId,
          userId: args.userId,
          title,
          content,
          category,
          tags,
          ragKey: '',
          contentHash,
          originThreadId,
          originMessageIds,
          source: toThreadMemorySource(args.source),
          createdAt: now,
          updatedAt: now,
        }))

      const ragKey = existing?.ragKey ?? buildRagKey('thread', memoryId.toString())

      if (!existing) {
        await ctx.runMutation(internal.functions.memoryInternal.patchThreadMemoryRagKey, {
          memoryId: memoryId as Id<'threadMemories'>,
          ragKey,
        })
      }

      await ctx.runMutation(internal.functions.memoryInternal.patchThreadMemory, {
        memoryId: memoryId as Id<'threadMemories'>,
        title,
        content,
        category: category ?? existing?.category,
        tags: mergeStringLists(existing?.tags, tags),
        contentHash,
        originThreadId: originThreadId ?? existing?.originThreadId,
        originMessageIds: mergeStringLists(existing?.originMessageIds, originMessageIds),
        source:
          existing?.source === 'manual' && args.source === 'extracted'
            ? existing.source
            : toThreadMemorySource(args.source),
        updatedAt: now,
      })

      await memoryRag.add(ctx, {
        namespace: args.userId,
        key: ragKey,
        title,
        text: content,
        filterValues: buildRagFilterValues({
          userId: args.userId,
          threadId,
          projectId: null,
        }),
        metadata: getMetadata({
          scope: 'thread',
          memoryId: memoryId.toString(),
          category,
          source:
            existing?.source === 'manual' && args.source === 'extracted'
              ? existing.source
              : toThreadMemorySource(args.source),
        }),
        contentHash,
      })

      const memory = await ctx.runQuery(internal.functions.memoryInternal.getThreadMemoryById, {
        id: memoryId as Id<'threadMemories'>,
      })

      if (!memory) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Failed to create memory',
        })
      }

      return formatMemory('thread', memory)
    }

    const projectId = args.projectId!
    const existing = await ctx.runQuery(
      internal.functions.memoryInternal.findProjectMemoryByContentHash,
      {
        projectId,
        contentHash,
      },
    )

    const memoryId =
      existing?._id ??
      (await ctx.runMutation(internal.functions.memoryInternal.insertProjectMemory, {
        projectId,
        userId: args.userId,
        title,
        content,
        category,
        tags,
        ragKey: '',
        contentHash,
        originThreadId,
        originMessageIds,
        source: toProjectMemorySource(args.source),
        createdAt: now,
        updatedAt: now,
      }))

    const ragKey = existing?.ragKey ?? buildRagKey('project', memoryId.toString())

    if (!existing) {
      await ctx.runMutation(internal.functions.memoryInternal.patchProjectMemoryRagKey, {
        memoryId: memoryId as Id<'projectMemories'>,
        ragKey,
      })
    }

    await ctx.runMutation(internal.functions.memoryInternal.patchProjectMemory, {
      memoryId: memoryId as Id<'projectMemories'>,
      title,
      content,
      category: category ?? existing?.category,
      tags: mergeStringLists(existing?.tags, tags),
      contentHash,
      originThreadId: originThreadId ?? existing?.originThreadId,
      originMessageIds: mergeStringLists(existing?.originMessageIds, originMessageIds),
      source:
        existing?.source === 'manual' && args.source === 'extracted'
          ? existing.source
          : toProjectMemorySource(args.source),
      updatedAt: now,
    })

    await memoryRag.add(ctx, {
      namespace: args.userId,
      key: ragKey,
      title,
      text: content,
      filterValues: buildRagFilterValues({
        userId: args.userId,
        threadId: originThreadId ?? null,
        projectId,
      }),
      metadata: getMetadata({
        scope: 'project',
        memoryId: memoryId.toString(),
        category,
        source:
          existing?.source === 'manual' && args.source === 'extracted'
            ? existing.source
            : toProjectMemorySource(args.source),
      }),
      contentHash,
    })

    const memory = await ctx.runQuery(internal.functions.memoryInternal.getProjectMemoryById, {
      id: memoryId as Id<'projectMemories'>,
    })

    if (!memory) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Failed to create memory',
      })
    }

    return formatMemory('project', memory)
  },
})

export const updateMemoryInScope = internalAction({
  args: {
    scope: memoryScopeValidator,
    userId: v.id('users'),
    userMemoryId: v.optional(v.id('userMemories')),
    threadMemoryId: v.optional(v.id('threadMemories')),
    projectMemoryId: v.optional(v.id('projectMemories')),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const nextTitle = normalizeOptionalString(args.title)
    const nextCategory = normalizeOptionalString(args.category)
    const nextTags = normalizeTags(args.tags)

    if (
      nextTitle === undefined &&
      args.content === undefined &&
      nextCategory === undefined &&
      nextTags === undefined
    ) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'No memory changes were provided',
      })
    }

    const now = Date.now()

    if (args.scope === 'user') {
      const memoryId = args.userMemoryId
      if (!memoryId) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'userMemoryId is required for user memory updates',
        })
      }

      const memory = await ctx.runQuery(internal.functions.memoryInternal.getUserMemoryById, {
        id: memoryId,
      })
      if (!memory || memory.userId !== args.userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Memory not found',
        })
      }

      const content = args.content ? normalizeMemoryContent(args.content) : memory.content
      const contentHash = await hashMemoryContent(content)
      const title = nextTitle ?? memory.title
      const category = args.category !== undefined ? nextCategory : memory.category
      const tags = args.tags !== undefined ? nextTags : memory.tags

      await ctx.runMutation(internal.functions.memoryInternal.patchUserMemory, {
        memoryId,
        title,
        content,
        category,
        tags,
        contentHash,
        originThreadId: memory.originThreadId,
        originMessageIds: memory.originMessageIds,
        source: memory.source,
        updatedAt: now,
      })

      await memoryRag.add(ctx, {
        namespace: args.userId,
        key: memory.ragKey,
        title,
        text: content,
        filterValues: buildRagFilterValues({
          userId: args.userId,
          threadId: null,
          projectId: null,
        }),
        metadata: getMetadata({
          scope: 'user',
          memoryId: memoryId.toString(),
          category,
          source: memory.source,
        }),
        contentHash,
      })

      const updated = await ctx.runQuery(internal.functions.memoryInternal.getUserMemoryById, {
        id: memoryId,
      })
      if (!updated)
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Memory not found after update',
        })
      return formatMemory('user', updated)
    }

    if (args.scope === 'thread') {
      const memoryId = args.threadMemoryId
      if (!memoryId) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'threadMemoryId is required for thread memory updates',
        })
      }

      const memory = await ctx.runQuery(internal.functions.memoryInternal.getThreadMemoryById, {
        id: memoryId,
      })
      if (!memory || memory.userId !== args.userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Memory not found',
        })
      }

      const content = args.content ? normalizeMemoryContent(args.content) : memory.content
      const contentHash = await hashMemoryContent(content)
      const title = nextTitle ?? memory.title
      const category = args.category !== undefined ? nextCategory : memory.category
      const tags = args.tags !== undefined ? nextTags : memory.tags

      await ctx.runMutation(internal.functions.memoryInternal.patchThreadMemory, {
        memoryId,
        title,
        content,
        category,
        tags,
        contentHash,
        originThreadId: memory.originThreadId,
        originMessageIds: memory.originMessageIds,
        source: memory.source,
        updatedAt: now,
      })

      await memoryRag.add(ctx, {
        namespace: args.userId,
        key: memory.ragKey,
        title,
        text: content,
        filterValues: buildRagFilterValues({
          userId: args.userId,
          threadId: memory.threadId,
          projectId: null,
        }),
        metadata: getMetadata({
          scope: 'thread',
          memoryId: memoryId.toString(),
          category,
          source: memory.source,
        }),
        contentHash,
      })

      const updated = await ctx.runQuery(internal.functions.memoryInternal.getThreadMemoryById, {
        id: memoryId,
      })
      if (!updated)
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Memory not found after update',
        })
      return formatMemory('thread', updated)
    }

    const memoryId = args.projectMemoryId
    if (!memoryId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'projectMemoryId is required for project memory updates',
      })
    }

    const memory = await ctx.runQuery(internal.functions.memoryInternal.getProjectMemoryById, {
      id: memoryId,
    })
    if (!memory || memory.userId !== args.userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Memory not found',
      })
    }

    const content = args.content ? normalizeMemoryContent(args.content) : memory.content
    const contentHash = await hashMemoryContent(content)
    const title = nextTitle ?? memory.title
    const category = args.category !== undefined ? nextCategory : memory.category
    const tags = args.tags !== undefined ? nextTags : memory.tags

    await ctx.runMutation(internal.functions.memoryInternal.patchProjectMemory, {
      memoryId,
      title,
      content,
      category,
      tags,
      contentHash,
      originThreadId: memory.originThreadId,
      originMessageIds: memory.originMessageIds,
      source: memory.source,
      updatedAt: now,
    })

    await memoryRag.add(ctx, {
      namespace: args.userId,
      key: memory.ragKey,
      title,
      text: content,
      filterValues: buildRagFilterValues({
        userId: args.userId,
        threadId: memory.originThreadId ?? null,
        projectId: memory.projectId,
      }),
      metadata: getMetadata({
        scope: 'project',
        memoryId: memoryId.toString(),
        category,
        source: memory.source,
      }),
      contentHash,
    })

    const updated = await ctx.runQuery(internal.functions.memoryInternal.getProjectMemoryById, {
      id: memoryId,
    })
    if (!updated)
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Memory not found after update',
      })
    return formatMemory('project', updated)
  },
})

export const deleteMemoryInScope = internalAction({
  args: {
    scope: memoryScopeValidator,
    userId: v.id('users'),
    userMemoryId: v.optional(v.id('userMemories')),
    threadMemoryId: v.optional(v.id('threadMemories')),
    projectMemoryId: v.optional(v.id('projectMemories')),
  },
  handler: async (ctx, args) => {
    const table = scopeToTable(args.scope)

    if (table === 'userMemories') {
      const memoryId = args.userMemoryId
      if (!memoryId) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'userMemoryId is required for deletion',
        })
      }
      const memory = await ctx.runQuery(internal.functions.memoryInternal.getUserMemoryById, {
        id: memoryId,
      })
      if (!memory || memory.userId !== args.userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Memory not found',
        })
      }
      await ctx.runMutation(components.rag.entries.deleteByKeyAsync, {
        namespaceId: args.userId,
        key: memory.ragKey,
      })
      await ctx.runMutation(internal.functions.memoryInternal.deleteUserMemoryRecord, {
        memoryId,
      })
      return { success: true }
    }

    if (table === 'threadMemories') {
      const memoryId = args.threadMemoryId
      if (!memoryId) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'threadMemoryId is required for deletion',
        })
      }
      const memory = await ctx.runQuery(internal.functions.memoryInternal.getThreadMemoryById, {
        id: memoryId,
      })
      if (!memory || memory.userId !== args.userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Memory not found',
        })
      }
      await ctx.runMutation(components.rag.entries.deleteByKeyAsync, {
        namespaceId: args.userId,
        key: memory.ragKey,
      })
      await ctx.runMutation(internal.functions.memoryInternal.deleteThreadMemoryRecord, {
        memoryId,
      })
      return { success: true }
    }

    const memoryId = args.projectMemoryId
    if (!memoryId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'projectMemoryId is required for deletion',
      })
    }
    const memory = await ctx.runQuery(internal.functions.memoryInternal.getProjectMemoryById, {
      id: memoryId,
    })
    if (!memory || memory.userId !== args.userId) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Memory not found' })
    }
    await ctx.runMutation(components.rag.entries.deleteByKeyAsync, {
      namespaceId: args.userId,
      key: memory.ragKey,
    })
    await ctx.runMutation(internal.functions.memoryInternal.deleteProjectMemoryRecord, {
      memoryId,
    })
    return { success: true }
  },
})

export const patchUserMemoryRagKey = internalMutation({
  args: {
    memoryId: v.id('userMemories'),
    ragKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, { ragKey: args.ragKey })
  },
})

export const patchThreadMemoryRagKey = internalMutation({
  args: {
    memoryId: v.id('threadMemories'),
    ragKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, { ragKey: args.ragKey })
  },
})

export const patchProjectMemoryRagKey = internalMutation({
  args: {
    memoryId: v.id('projectMemories'),
    ragKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memoryId, { ragKey: args.ragKey })
  },
})
