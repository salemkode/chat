import { createTool, type ToolCtx } from '@convex-dev/agent'
import { z } from 'zod'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import {
  buildRagFilterValues,
  formatMemory,
  type MemoryListItem,
  type PublicMemoryScope,
} from '../functions/memoryShared'
import { ensureOpenRouterConfigured, memoryRag } from '../functions/memoryRag'

type MemoryHit = MemoryListItem & {
  score?: number
  rank: number
  metadata?: Record<string, unknown>
}

type LinkedProject = {
  _id: Id<'projects'>
  name: string
}

const memorySearchInputSchema = z.object({
  query: z.string().min(1).max(500).describe('What saved memory to search for.'),
  scope: z
    .enum(['all', 'user', 'thread', 'project'])
    .optional()
    .describe('Where to search. Defaults to all scopes.'),
  projectId: z
    .string()
    .optional()
    .describe('Optional when the current chat already has a linked project.'),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum memories to return. Defaults to 5.'),
  categories: z
    .array(z.string().min(1).max(80))
    .max(8)
    .optional()
    .describe('Optional category filter.'),
})

const memoryAddInputSchema = z.object({
  scope: z.enum(['user', 'thread', 'project']).describe('Where to store the memory.'),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(1000),
  category: z.string().min(1).max(80).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
  projectId: z
    .string()
    .optional()
    .describe('Optional if the current chat already has a linked project.'),
})

const memoryUpdateInputSchema = z.object({
  scope: z.enum(['user', 'thread', 'project']),
  memoryId: z.string().min(1).describe('The `memoryId` returned by `memory_search`.'),
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(1000).optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
})

const memoryDeleteInputSchema = z.object({
  scope: z.enum(['user', 'thread', 'project']),
  memoryId: z.string().min(1).describe('The `memoryId` returned by `memory_search`.'),
})

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

function getUserId(ctx: ToolCtx) {
  if (!ctx.userId) {
    throw new Error('Missing userId in memory tool context')
  }
  return ctx.userId as Id<'users'>
}

function getThreadId(ctx: ToolCtx) {
  if (!ctx.threadId) {
    throw new Error('Missing threadId in memory tool context')
  }
  return ctx.threadId
}

async function getLinkedProjects(ctx: ToolCtx) {
  const userId = getUserId(ctx)
  const threadId = getThreadId(ctx)
  return (await ctx.runQuery(internal.functions.memoryInternal.listProjectsForThread, {
    userId,
    threadId,
  })) as LinkedProject[]
}

async function resolveProjectId(
  ctx: ToolCtx,
  requestedProjectId?: string,
): Promise<Id<'projects'>> {
  const linkedProjects = await getLinkedProjects(ctx)

  if (linkedProjects.length === 0) {
    throw new Error('No projects are linked to the current thread')
  }

  if (requestedProjectId) {
    const match = linkedProjects.find((project) => project._id.toString() === requestedProjectId)
    if (!match) {
      throw new Error(`Project ${requestedProjectId} is not linked to the current thread`)
    }
    return match._id
  }

  if (linkedProjects.length === 1) {
    return linkedProjects[0]!._id
  }

  throw new Error('No project is linked to the current thread')
}

async function searchMemoryHits(
  ctx: ToolCtx,
  args: {
    query: string
    scope?: PublicMemoryScope
    projectId?: string
    maxResults?: number
    categories?: string[]
  },
): Promise<MemoryHit[]> {
  ensureOpenRouterConfigured()

  const userId = getUserId(ctx)
  const threadId = getThreadId(ctx)
  const scope = args.scope ?? 'all'
  const maxResults = Math.max(1, Math.min(args.maxResults ?? 5, 10))

  const filters =
    scope === 'thread'
      ? buildRagFilterValues({
          userId,
          threadId,
          projectId: null,
        }).filter((filter) => filter.name !== 'projectId')
      : scope === 'project'
        ? buildRagFilterValues({
            userId,
            threadId: null,
            projectId: await resolveProjectId(ctx, args.projectId),
          }).filter((filter) => filter.name !== 'threadId')
        : [{ name: 'userId', value: userId }]

  const rawSearch = (await memoryRag.search(ctx, {
    namespace: userId,
    query: args.query.trim(),
    limit: Math.max(maxResults * 3, maxResults),
    filters,
  })) as {
    entries?: Array<Record<string, unknown>>
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

  const memoryMap = new Map<string, MemoryListItem>()
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

  return entries
    .map((entry, index) => {
      const metadata =
        entry.metadata && typeof entry.metadata === 'object'
          ? (entry.metadata as Record<string, unknown>)
          : undefined
      const entryScope =
        metadata?.scope === 'user' || metadata?.scope === 'thread' || metadata?.scope === 'project'
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
}

export const memoryTools = {
  memory_search: createTool({
    description:
      'Search saved memory when the user asks what is remembered, or before updating or deleting a memory.',
    inputSchema: memorySearchInputSchema,
    execute: async (ctx, input) => {
      try {
        const hits = await searchMemoryHits(ctx, input)
        return {
          ok: true,
          scope: input.scope ?? 'all',
          query: input.query.trim(),
          hits,
        }
      } catch (error) {
        return {
          ok: false,
          scope: input.scope ?? 'all',
          query: input.query.trim(),
          hits: [],
          error: errorToMessage(error),
        }
      }
    },
  }),
  memory_add: createTool({
    description: 'Save explicit durable information the user asked to remember.',
    inputSchema: memoryAddInputSchema,
    execute: async (ctx, input) => {
      try {
        ensureOpenRouterConfigured()

        const userId = getUserId(ctx)
        const threadId = getThreadId(ctx)
        const projectId =
          input.scope === 'project' ? await resolveProjectId(ctx, input.projectId) : undefined

        const memory = await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
          scope: input.scope,
          userId,
          threadId: input.scope === 'thread' ? threadId : undefined,
          projectId,
          title: input.title,
          content: input.content,
          category: input.category,
          tags: input.tags,
          source: 'manual',
          originThreadId: threadId,
        })

        return {
          ok: true,
          scope: input.scope,
          memory,
        }
      } catch (error) {
        return {
          ok: false,
          scope: input.scope,
          error: errorToMessage(error),
        }
      }
    },
  }),
  memory_update: createTool({
    description:
      'Update an existing saved memory by `memoryId`. Usually call `memory_search` first.',
    inputSchema: memoryUpdateInputSchema,
    execute: async (ctx, input) => {
      try {
        ensureOpenRouterConfigured()

        const userId = getUserId(ctx)

        const updated = await ctx.runAction(internal.functions.memoryInternal.updateMemoryInScope, {
          scope: input.scope,
          userId,
          userMemoryId: input.scope === 'user' ? (input.memoryId as Id<'userMemories'>) : undefined,
          threadMemoryId:
            input.scope === 'thread' ? (input.memoryId as Id<'threadMemories'>) : undefined,
          projectMemoryId:
            input.scope === 'project' ? (input.memoryId as Id<'projectMemories'>) : undefined,
          title: input.title,
          content: input.content,
          category: input.category,
          tags: input.tags,
        })

        return {
          ok: true,
          scope: input.scope,
          memory: updated,
        }
      } catch (error) {
        return {
          ok: false,
          scope: input.scope,
          error: errorToMessage(error),
        }
      }
    },
  }),
  memory_delete: createTool({
    description:
      'Delete an existing saved memory by `memoryId`. Usually call `memory_search` first.',
    inputSchema: memoryDeleteInputSchema,
    execute: async (ctx, input) => {
      try {
        const userId = getUserId(ctx)

        await ctx.runAction(internal.functions.memoryInternal.deleteMemoryInScope, {
          scope: input.scope,
          userId,
          userMemoryId: input.scope === 'user' ? (input.memoryId as Id<'userMemories'>) : undefined,
          threadMemoryId:
            input.scope === 'thread' ? (input.memoryId as Id<'threadMemories'>) : undefined,
          projectMemoryId:
            input.scope === 'project' ? (input.memoryId as Id<'projectMemories'>) : undefined,
        })

        return {
          ok: true,
          scope: input.scope,
          memoryId: input.memoryId,
        }
      } catch (error) {
        return {
          ok: false,
          scope: input.scope,
          memoryId: input.memoryId,
          error: errorToMessage(error),
        }
      }
    },
  }),
}
