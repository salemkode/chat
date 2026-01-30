import { action, internalMutation, mutation, query } from '../_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { components } from '../_generated/api'
import { RAG } from '@convex-dev/rag'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { ConvexError } from 'convex/values'

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const rag = new RAG(components.rag, {
  textEmbeddingModel: openRouter.textEmbeddingModel(
    'openai/text-embedding-3-small',
  ),
  embeddingDimension: 1536,
  filterNames: ['userId', 'threadId', 'projectId'],
})

export const insertUserMemory = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: v.union(
      v.literal('manual'),
      v.literal('extracted'),
      v.literal('system'),
    ),
    embedding: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('userMemories', {
      userId: args.userId,
      title: args.title,
      content: args.content,
      category: args.category,
      tags: args.tags,
      embedding: args.embedding,
      source: args.source,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    })
  },
})

export const createUserMemory = action({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: v.union(
      v.literal('manual'),
      v.literal('extracted'),
      v.literal('system'),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create memories',
      })
    }

    await rag.add(ctx, {
      namespace: userId,
      text: args.content,
    })

    return { success: true }
  },
})

export const insertThreadMemory = internalMutation({
  args: {
    threadId: v.string(),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.union(v.literal('session'), v.literal('manual')),
    embedding: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('threadMemories', {
      threadId: args.threadId,
      userId: args.userId,
      title: args.title,
      content: args.content,
      category: args.category,
      embedding: args.embedding,
      source: args.source,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    })
  },
})

export const createThreadMemory = action({
  args: {
    threadId: v.string(),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.union(v.literal('session'), v.literal('manual')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create thread memories',
      })
    }

    await rag.add(ctx, {
      namespace: userId,
      text: args.content,
    })
    await rag.add(ctx, {
      namespace: args.threadId,
      text: args.content,
    })

    return { success: true }
  },
})

export const insertProjectMemory = internalMutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.union(v.literal('manual'), v.literal('aggregated')),
    embedding: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('projectMemories', {
      projectId: args.projectId,
      userId: args.userId,
      title: args.title,
      content: args.content,
      category: args.category,
      embedding: args.embedding,
      source: args.source,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    })
  },
})

export const createProjectMemory = action({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    source: v.union(v.literal('manual'), v.literal('aggregated')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create project memories',
      })
    }

    await rag.add(ctx, {
      namespace: userId,
      text: args.content,
    })

    return { success: true }
  },
})

export const listUserMemories = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: () => {
    // const userId = await getAuthUserId(ctx);
    // if (!userId) return [];

    // let query = ctx.db
    // 	.query("userMemories")
    // 	.withIndex("by_user", (q) => q.eq("userId", userId));

    // if (args.category) {
    // 	query = ctx.db
    // 		.query("userMemories")
    // 		.withIndex("by_category", (q) =>
    // 			q.eq("userId", userId).eq("category", args.category),
    // 		);
    // }

    // const results = await query.order("desc").take(args.limit ?? 50);

    // const { results, text, entries, usage } = await rag.search(ctx, {
    // 			namespace: userId,
    // 	query: args.query,
    // 	limit: 10,
    // 	vectorScoreThreshold: 0.5, // Only return results with a score >= 0.5
    // });

    return { results: [], text: '', entries: [], usage: { tokens: 0 } }
  },
})

export const updateMemory = mutation({
  args: {
    scope: v.union(
      v.literal('user'),
      v.literal('thread'),
      v.literal('project'),
    ),
    memoryId: v.id('userMemories'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update memories',
      })
    }

    const table =
      args.scope === 'user'
        ? 'userMemories'
        : args.scope === 'thread'
          ? 'threadMemories'
          : 'projectMemories'

    const memory = await ctx.db.get(table, args.memoryId)
    if (!memory) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Memory not found',
      })
    }

    const memoryUserId = 'userId' in memory ? memory.userId : undefined
    if (memoryUserId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this memory',
      })
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.title) updates.title = args.title
    if (args.content) updates.content = args.content
    if (args.category) updates.category = args.category
    if (args.tags) updates.tags = args.tags

    await ctx.db.patch(table, args.memoryId, updates)
    return { success: true }
  },
})

export const deleteMemory = mutation({
  args: {
    memoryType: v.union(
      v.object({
        scope: v.literal('userMemories'),
        memoryId: v.id('userMemories'),
      }),
      v.object({
        scope: v.literal('threadMemories'),
        memoryId: v.id('threadMemories'),
      }),
      v.object({
        scope: v.literal('projectMemories'),
        memoryId: v.id('projectMemories'),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to delete memories',
      })
    }

    const memory = await ctx.db.get(
      args.memoryType.scope,
      args.memoryType.memoryId,
    )
    if (!memory) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Memory not found',
      })
    }

    await ctx.db.delete(args.memoryType.scope, args.memoryType.memoryId)
    return { success: true }
  },
})

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create a project',
      })
    }

    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      userId,
      threadIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { projectId: projectId.toString() }
  },
})

export const listProjects = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()

    return projects.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      threadIds: p.threadIds,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  },
})

export const addThreadToProject = mutation({
  args: {
    projectId: v.id('projects'),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update a project',
      })
    }

    const project = await ctx.db.get('projects', args.projectId)
    if (!project || project.userId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Project not found or you do not have permission to update it',
      })
    }

    const threadIds = project.threadIds || []
    if (!threadIds.includes(args.threadId)) {
      await ctx.db.patch('projects', args.projectId, {
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
    scope: v.optional(
      v.union(
        v.literal('user'),
        v.literal('thread'),
        v.literal('project'),
        v.literal('all'),
      ),
    ),
    threadId: v.optional(v.string()),
    projectId: v.optional(v.id('projects')),
    maxResults: v.optional(v.number()),
    minScore: v.optional(v.number()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to search memories',
      })
    }

    return {
      results: [],
      text: '',
      entries: [],
      usage: { tokens: 0 },
      hits: [],
    }
  },
})
