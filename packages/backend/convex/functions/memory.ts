import { action, mutation, query, type ActionCtx, type QueryCtx } from '../_generated/server'
import { v, ConvexError } from 'convex/values'
import { paginationOptsValidator } from 'convex/server'
import { type AuthCtx, getAuthUserId } from '../lib/auth'
import type { Doc, Id } from '../_generated/dataModel'
import { api, components, internal } from '../_generated/api'
import { memoryRag, ensureOpenRouterConfigured } from './memoryRag'
import {
  buildRagFilterValues,
  formatMemory,
  type MemoryListItem,
  matchesMemoryFilters,
  memoryScopeValidator,
  paginateMemories,
  publicMemoryScopeValidator,
  scopedMemorySourceValidator,
  userMemorySourceValidator,
} from './memoryShared'
import {
  ensureProjectOwnerMembership,
  listAccessibleProjectIds,
  requireProjectRole,
} from '../lib/projectAccess'

type MemoryQueryCtx = QueryCtx
type MemoryActionCtx = ActionCtx
type MemoryReaderCtx = MemoryQueryCtx | MemoryActionCtx
type UserMemoryDoc = Doc<'userMemories'>
type ThreadMemoryDoc = Doc<'threadMemories'>
type ProjectMemoryDoc = Doc<'projectMemories'>

const memoryListItemValidator = v.object({
  memoryId: v.string(),
  scope: memoryScopeValidator,
  title: v.string(),
  content: v.string(),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  source: v.string(),
  userId: v.string(),
  threadId: v.optional(v.string()),
  projectId: v.optional(v.string()),
  originThreadId: v.optional(v.string()),
  originMessageIds: v.optional(v.array(v.string())),
  createdAt: v.number(),
  updatedAt: v.number(),
})

const paginatedMemoryResultValidator = v.object({
  page: v.array(memoryListItemValidator),
  isDone: v.boolean(),
  continueCursor: v.union(v.null(), v.string()),
  total: v.number(),
})

const projectListItemValidator = v.object({
  id: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  threadIds: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})

async function requireUserId(ctx: MemoryReaderCtx) {
  const userId =
    'db' in ctx
      ? await getAuthUserId(ctx as AuthCtx)
      : await ctx.runMutation(api.users.ensureCurrentUser, {})
  if (!userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to manage memories',
    })
  }
  return userId
}

async function assertThreadOwnership(
  ctx: MemoryActionCtx,
  args: { threadId: string; userId: Id<'users'> },
) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId: args.threadId,
  })

  if (!thread || thread.userId !== args.userId) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Thread not found or you do not have access to it',
    })
  }
}

async function assertProjectOwnership(
  ctx: MemoryActionCtx,
  args: { projectId: Id<'projects'>; userId: Id<'users'> },
) {
  const hasAccess = await ctx.runQuery(internal.functions.memoryInternal.hasProjectAccessForUser, {
    projectId: args.projectId,
    userId: args.userId,
    minimumRole: 'viewer',
  })
  if (!hasAccess) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Project not found or you do not have access to it',
    })
  }
}

async function listUserMemoryDocs(
  ctx: MemoryQueryCtx,
  userId: Id<'users'>,
): Promise<MemoryListItem[]> {
  const memories = await ctx.db
    .query('userMemories')
    .withIndex('by_user_updated', (q) => q.eq('userId', userId))
    .collect()

  return memories
    .sort(
      (a: UserMemoryDoc, b: UserMemoryDoc) =>
        b.updatedAt - a.updatedAt || b._creationTime - a._creationTime,
    )
    .map((memory) => formatMemory('user', memory))
}

async function listThreadMemoryDocs(
  ctx: MemoryQueryCtx,
  userId: Id<'users'>,
  threadId?: string,
): Promise<MemoryListItem[]> {
  const memories = threadId
    ? await ctx.db
        .query('threadMemories')
        .withIndex('by_thread_updated', (q) => q.eq('threadId', threadId))
        .collect()
    : await ctx.db
        .query('threadMemories')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()

  return memories
    .filter((memory) => memory.userId === userId)
    .sort(
      (a: ThreadMemoryDoc, b: ThreadMemoryDoc) =>
        b.updatedAt - a.updatedAt || b._creationTime - a._creationTime,
    )
    .map((memory) => formatMemory('thread', memory))
}

async function listProjectMemoryDocs(
  ctx: MemoryQueryCtx,
  userId: Id<'users'>,
  projectId?: Id<'projects'>,
): Promise<MemoryListItem[]> {
  const memories = projectId
    ? await ctx.db
        .query('projectMemories')
        .withIndex('by_project_updated', (q) => q.eq('projectId', projectId))
        .collect()
    : await ctx.db
        .query('projectMemories')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()

  return memories
    .filter((memory) => memory.userId === userId)
    .sort(
      (a: ProjectMemoryDoc, b: ProjectMemoryDoc) =>
        b.updatedAt - a.updatedAt || b._creationTime - a._creationTime,
    )
    .map((memory) => formatMemory('project', memory))
}

export const createUserMemory = action({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: memoryListItemValidator,
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()
    const userId = await requireUserId(ctx)

    return await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
      scope: 'user',
      userId,
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      source: 'manual',
    })
  },
})

export const createThreadMemory = action({
  args: {
    threadId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: memoryListItemValidator,
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()
    const userId = await requireUserId(ctx)
    await assertThreadOwnership(ctx, { threadId: args.threadId, userId })

    return await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
      scope: 'thread',
      userId,
      threadId: args.threadId,
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      source: 'manual',
    })
  },
})

export const createProjectMemory = action({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: memoryListItemValidator,
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()
    const userId = await requireUserId(ctx)
    await assertProjectOwnership(ctx, { projectId: args.projectId, userId })

    return await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
      scope: 'project',
      userId,
      projectId: args.projectId,
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      source: 'manual',
    })
  },
})

export const listUserMemories = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(v.string()),
    source: v.optional(userMemorySourceValidator),
    tags: v.optional(v.array(v.string())),
    query: v.optional(v.string()),
  },
  returns: paginatedMemoryResultValidator,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const memories = await listUserMemoryDocs(ctx, userId)
    const filtered = memories.filter((memory) =>
      matchesMemoryFilters(memory, {
        category: args.category,
        source: args.source,
        tags: args.tags,
        query: args.query,
      }),
    )

    return paginateMemories(filtered, {
      cursor: args.paginationOpts.cursor ?? undefined,
      limit: args.paginationOpts.numItems,
    })
  },
})

export const listThreadMemories = query({
  args: {
    paginationOpts: paginationOptsValidator,
    threadId: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(scopedMemorySourceValidator),
    tags: v.optional(v.array(v.string())),
    query: v.optional(v.string()),
  },
  returns: paginatedMemoryResultValidator,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    if (args.threadId) {
      const thread = await ctx.runQuery(components.agent.threads.getThread, {
        threadId: args.threadId,
      })
      if (!thread || thread.userId !== userId) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Thread not found',
        })
      }
    }

    const memories = await listThreadMemoryDocs(ctx, userId, args.threadId)
    const filtered = memories.filter((memory) =>
      matchesMemoryFilters(memory, {
        category: args.category,
        source: args.source,
        tags: args.tags,
        query: args.query,
      }),
    )

    return paginateMemories(filtered, {
      cursor: args.paginationOpts.cursor ?? undefined,
      limit: args.paginationOpts.numItems,
    })
  },
})

export const listProjectMemories = query({
  args: {
    paginationOpts: paginationOptsValidator,
    projectId: v.optional(v.id('projects')),
    category: v.optional(v.string()),
    source: v.optional(scopedMemorySourceValidator),
    tags: v.optional(v.array(v.string())),
    query: v.optional(v.string()),
  },
  returns: paginatedMemoryResultValidator,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    if (args.projectId) {
      try {
        await requireProjectRole(ctx, {
          projectId: args.projectId,
          userId,
          minimumRole: 'viewer',
        })
      } catch {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        })
      }
    }

    const memories = await listProjectMemoryDocs(ctx, userId, args.projectId)
    const filtered = memories.filter((memory) =>
      matchesMemoryFilters(memory, {
        category: args.category,
        source: args.source,
        tags: args.tags,
        query: args.query,
      }),
    )

    return paginateMemories(filtered, {
      cursor: args.paginationOpts.cursor ?? undefined,
      limit: args.paginationOpts.numItems,
    })
  },
})

export const updateMemory = action({
  args: {
    scope: memoryScopeValidator,
    userMemoryId: v.optional(v.id('userMemories')),
    threadMemoryId: v.optional(v.id('threadMemories')),
    projectMemoryId: v.optional(v.id('projectMemories')),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: memoryListItemValidator,
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()
    const userId = await requireUserId(ctx)

    return await ctx.runAction(internal.functions.memoryInternal.updateMemoryInScope, {
      ...args,
      userId,
    })
  },
})

export const deleteMemory = action({
  args: {
    scope: memoryScopeValidator,
    userMemoryId: v.optional(v.id('userMemories')),
    threadMemoryId: v.optional(v.id('threadMemories')),
    projectMemoryId: v.optional(v.id('projectMemories')),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    return await ctx.runAction(internal.functions.memoryInternal.deleteMemoryInScope, {
      ...args,
      userId,
    })
  },
})

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({ projectId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)

    const projectId = await ctx.db.insert('projects', {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      ownerUserId: userId,
      userId,
      visibility: 'private',
      threadIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    const project = await ctx.db.get(projectId)
    if (project) {
      await ensureProjectOwnerMembership(ctx, {
        project,
        userId,
      })
    }

    return { projectId: projectId.toString() }
  },
})

export const listProjects = query({
  args: {},
  returns: v.array(projectListItemValidator),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)

    const projectIds = await listAccessibleProjectIds(ctx, userId)
    const projects = (await Promise.all(projectIds.map((projectId) => ctx.db.get(projectId))))
      .filter((project): project is NonNullable<typeof project> => project !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt)

    return projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      threadIds: project.threadIds ?? [],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }))
  },
})

export const getProjectById = query({
  args: {
    projectId: v.id('projects'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('projects'),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      ownerUserId: v.id('users'),
      userId: v.optional(v.id('users')),
      visibility: v.union(v.literal('private'), v.literal('shared')),
      threadIds: v.optional(v.array(v.string())),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId)
    if (!project) {
      return null
    }

    const ownerUserId = project.ownerUserId ?? project.userId
    if (!ownerUserId) {
      // Ignore malformed legacy rows that have no recoverable owner.
      return null
    }

    return {
      ...project,
      ownerUserId,
      userId: project.userId ?? ownerUserId,
      visibility: project.visibility ?? 'private',
      threadIds: project.threadIds ?? [],
    }
  },
})

export const addThreadToProject = mutation({
  args: {
    projectId: v.id('projects'),
    threadId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    try {
      await requireProjectRole(ctx, {
        projectId: args.projectId,
        userId,
        minimumRole: 'viewer',
      })
    } catch {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Project not found or you do not have permission to update it',
      })
    }

    const project = await ctx.db.get(args.projectId)
    if (!project) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      })
    }

    const threadIds = project.threadIds ?? []
    if (!threadIds.includes(args.threadId)) {
      await ctx.db.patch(args.projectId, {
        threadIds: [...threadIds, args.threadId],
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})

export const searchMemory = action({
  args: {
    query: v.string(),
    scope: v.optional(publicMemoryScopeValidator),
    threadId: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    maxResults: v.optional(v.number()),
    minScore: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
  },
  returns: v.object({
    text: v.string(),
    hits: v.array(
      v.object({
        memoryId: v.string(),
        scope: memoryScopeValidator,
        title: v.string(),
        content: v.string(),
        category: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        source: v.string(),
        userId: v.string(),
        threadId: v.optional(v.string()),
        projectId: v.optional(v.string()),
        originThreadId: v.optional(v.string()),
        originMessageIds: v.optional(v.array(v.string())),
        createdAt: v.number(),
        updatedAt: v.number(),
        score: v.optional(v.number()),
        rank: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()
    const userId = await requireUserId(ctx)
    const scope = args.scope ?? 'all'
    const maxResults = Math.max(1, Math.min(args.maxResults ?? 10, 50))

    if (!args.query.trim()) {
      return {
        text: '',
        hits: [],
      }
    }

    if (scope === 'thread') {
      if (!args.threadId) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'threadId is required for thread memory search',
        })
      }
      await assertThreadOwnership(ctx, { threadId: args.threadId, userId })
    }

    if (scope === 'project') {
      if (!args.projectId) {
        throw new ConvexError({
          code: 'VALIDATION_ERROR',
          message: 'projectId is required for project memory search',
        })
      }
      await assertProjectOwnership(ctx, { projectId: args.projectId, userId })
    }

    const filters =
      scope === 'thread'
        ? buildRagFilterValues({
            userId,
            threadId: args.threadId!,
            projectId: null,
          }).filter((filter) => filter.name !== 'projectId')
        : scope === 'project'
          ? buildRagFilterValues({
              userId,
              threadId: null,
              projectId: args.projectId!,
            }).filter((filter) => filter.name !== 'threadId')
          : [{ name: 'userId', value: userId }]

    const rawSearch = (await memoryRag.search(ctx, {
      namespace: userId,
      query: args.query.trim(),
      limit: Math.max(maxResults * 3, maxResults),
      filters,
      vectorScoreThreshold: args.minScore,
    })) as {
      results?: unknown[]
      text?: string
      entries?: Array<Record<string, unknown>>
      usage?: unknown
    }

    const entries = Array.isArray(rawSearch.entries) ? rawSearch.entries : []

    const idsByScope = {
      user: [] as Id<'userMemories'>[],
      thread: [] as Id<'threadMemories'>[],
      project: [] as Id<'projectMemories'>[],
    }

    for (const entry of entries) {
      const metadata =
        entry.metadata && typeof entry.metadata === 'object'
          ? (entry.metadata as Record<string, unknown>)
          : undefined
      const entryScope = metadata?.scope
      const memoryId = metadata?.memoryId

      if (entryScope === 'user' && typeof memoryId === 'string') {
        idsByScope.user.push(memoryId as Id<'userMemories'>)
      }
      if (entryScope === 'thread' && typeof memoryId === 'string') {
        idsByScope.thread.push(memoryId as Id<'threadMemories'>)
      }
      if (entryScope === 'project' && typeof memoryId === 'string') {
        idsByScope.project.push(memoryId as Id<'projectMemories'>)
      }
    }

    const [userDocs, threadDocs, projectDocs] = await Promise.all([
      idsByScope.user.length
        ? ctx.runQuery(internal.functions.memoryInternal.getUserMemoriesByIds, {
            ids: idsByScope.user,
          })
        : Promise.resolve([]),
      idsByScope.thread.length
        ? ctx.runQuery(internal.functions.memoryInternal.getThreadMemoriesByIds, {
            ids: idsByScope.thread,
          })
        : Promise.resolve([]),
      idsByScope.project.length
        ? ctx.runQuery(internal.functions.memoryInternal.getProjectMemoriesByIds, {
            ids: idsByScope.project,
          })
        : Promise.resolve([]),
    ])

    const memoryMap = new Map<string, ReturnType<typeof formatMemory>>()
    for (const memory of userDocs) {
      memoryMap.set(`user:${memory._id.toString()}`, formatMemory('user', memory))
    }
    for (const memory of threadDocs) {
      memoryMap.set(`thread:${memory._id.toString()}`, formatMemory('thread', memory))
    }
    for (const memory of projectDocs) {
      memoryMap.set(`project:${memory._id.toString()}`, formatMemory('project', memory))
    }

    const categorySet = args.categories?.length ? new Set(args.categories) : null
    const hits = entries
      .map((entry, index) => {
        const metadata =
          entry.metadata && typeof entry.metadata === 'object'
            ? (entry.metadata as Record<string, unknown>)
            : undefined
        const entryScope =
          metadata?.scope === 'user' ||
          metadata?.scope === 'thread' ||
          metadata?.scope === 'project'
            ? metadata.scope
            : undefined
        const memoryId = typeof metadata?.memoryId === 'string' ? metadata.memoryId : undefined

        if (!entryScope || !memoryId) return null

        const memory = memoryMap.get(`${entryScope}:${memoryId}`)
        if (!memory) return null

        if (categorySet && (!memory.category || !categorySet.has(memory.category))) {
          return null
        }

        return {
          ...memory,
          score:
            typeof entry.score === 'number'
              ? entry.score
              : typeof entry.similarity === 'number'
                ? entry.similarity
                : undefined,
          rank: index + 1,
          metadata,
        }
      })
      .filter((hit): hit is NonNullable<typeof hit> => hit !== null)
      .slice(0, maxResults)

    return {
      text: rawSearch.text ?? '',
      hits: hits.map(({ metadata: _metadata, ...hit }) => hit),
    }
  },
})
