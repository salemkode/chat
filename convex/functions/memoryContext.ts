import { internalAction } from '../_generated/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'
import { ensureOpenRouterConfigured, memoryRag } from './memoryRag'
import { buildRagFilterValues, formatMemory } from './memoryShared'
import { dedupeMemoryHitsByPriority } from './memoryContextHelpers'

const PROJECT_LIMIT = 4
const THREAD_LIMIT = 3
const USER_LIMIT = 2

type SearchScope = 'project' | 'thread' | 'user'

type ScopeHit = ReturnType<typeof formatMemory> & {
  contentHash: string
  score?: number
  rank: number
}

async function searchScopeHits(
  ctx: any,
  args: {
    userId: Id<'users'>
    threadId: string
    projectId?: Id<'projects'>
    query: string
    scope: SearchScope
    maxResults: number
  },
): Promise<ScopeHit[]> {
  const filters =
    args.scope === 'project' && args.projectId
      ? buildRagFilterValues({
          userId: args.userId,
          threadId: null,
          projectId: args.projectId,
        }).filter((filter) => filter.name !== 'threadId')
      : args.scope === 'thread'
        ? buildRagFilterValues({
            userId: args.userId,
            threadId: args.threadId,
            projectId: null,
          }).filter((filter) => filter.name !== 'projectId')
        : [{ name: 'userId', value: args.userId }]

  const rawSearch = (await memoryRag.search(ctx, {
    namespace: args.userId,
    query: args.query.trim(),
    limit: Math.max(args.maxResults * 3, args.maxResults),
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

  const memoryMap = new Map<string, { hit: ScopeHit; contentHash: string }>()

  for (const memory of userDocs) {
    memoryMap.set(`user:${memory._id.toString()}`, {
      hit: {
        ...formatMemory('user', memory),
        contentHash: memory.contentHash,
        rank: 0,
      },
      contentHash: memory.contentHash,
    })
  }

  for (const memory of threadDocs) {
    memoryMap.set(`thread:${memory._id.toString()}`, {
      hit: {
        ...formatMemory('thread', memory),
        contentHash: memory.contentHash,
        rank: 0,
      },
      contentHash: memory.contentHash,
    })
  }

  for (const memory of projectDocs) {
    memoryMap.set(`project:${memory._id.toString()}`, {
      hit: {
        ...formatMemory('project', memory),
        contentHash: memory.contentHash,
        rank: 0,
      },
      contentHash: memory.contentHash,
    })
  }

  const hits = entries
    .map<ScopeHit | null>((entry, index) => {
      const metadata =
        entry.metadata && typeof entry.metadata === 'object'
          ? (entry.metadata as Record<string, unknown>)
          : undefined
      const entryScope =
        metadata?.scope === 'user' || metadata?.scope === 'thread' || metadata?.scope === 'project'
          ? metadata.scope
          : undefined
      const memoryId = typeof metadata?.memoryId === 'string' ? metadata.memoryId : undefined

      if (!entryScope || !memoryId) {
        return null
      }

      const match = memoryMap.get(`${entryScope}:${memoryId}`)
      if (!match) {
        return null
      }

      return {
        ...match.hit,
        score:
          typeof entry.score === 'number'
            ? entry.score
            : typeof entry.similarity === 'number'
              ? entry.similarity
              : undefined,
        rank: index + 1,
      }
    })
    .filter((entry): entry is ScopeHit => entry !== null)

  return hits.slice(0, args.maxResults)
}

function formatSection(label: string, hits: ScopeHit[]) {
  if (hits.length === 0) {
    return `${label}\n- None`
  }

  return [
    label,
    ...hits.map((hit) =>
      [
        `- ${hit.title}`,
        `  Scope: ${hit.scope}`,
        hit.category ? `  Category: ${hit.category}` : null,
        hit.tags?.length ? `  Tags: ${hit.tags.join(', ')}` : null,
        `  Content: ${hit.content}`,
      ]
        .filter(Boolean)
        .join('\n'),
    ),
  ].join('\n')
}

export const buildPromptMemoryContext = internalAction({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
    prompt: v.string(),
    projectId: v.optional(v.id('projects')),
  },
  returns: v.object({
    project: v.union(
      v.null(),
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    projectHits: v.array(
      v.object({
        memoryId: v.string(),
        scope: v.union(v.literal('user'), v.literal('thread'), v.literal('project')),
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
    threadHits: v.array(
      v.object({
        memoryId: v.string(),
        scope: v.union(v.literal('user'), v.literal('thread'), v.literal('project')),
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
    userHits: v.array(
      v.object({
        memoryId: v.string(),
        scope: v.union(v.literal('user'), v.literal('thread'), v.literal('project')),
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
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()

    const prompt = args.prompt.trim()
    if (!prompt) {
      return {
        project: null,
        projectHits: [],
        threadHits: [],
        userHits: [],
        text: '',
      }
    }

    const projectDoc = args.projectId
      ? await ctx.runQuery(internal.functions.memoryInternal.getProjectById, {
          projectId: args.projectId,
        })
      : null

    const [projectHitsRaw, threadHitsRaw, userHitsRaw] = await Promise.all([
      args.projectId
        ? searchScopeHits(ctx, {
            userId: args.userId,
            threadId: args.threadId,
            projectId: args.projectId,
            query: prompt,
            scope: 'project',
            maxResults: PROJECT_LIMIT,
          })
        : Promise.resolve([]),
      searchScopeHits(ctx, {
        userId: args.userId,
        threadId: args.threadId,
        query: prompt,
        scope: 'thread',
        maxResults: THREAD_LIMIT,
      }),
      searchScopeHits(ctx, {
        userId: args.userId,
        threadId: args.threadId,
        query: prompt,
        scope: 'user',
        maxResults: USER_LIMIT,
      }),
    ])

    const [projectHits, threadHits, userHits] = dedupeMemoryHitsByPriority([
      projectHitsRaw,
      threadHitsRaw,
      userHitsRaw,
    ])

    const text = [
      'Retrieved memory context',
      projectDoc
        ? `Project context\n- ${projectDoc.name}${projectDoc.description ? `: ${projectDoc.description}` : ''}`
        : 'Project context\n- No project linked to this chat.',
      formatSection('Relevant project memories', projectHits),
      formatSection('Relevant thread memories', threadHits),
      formatSection('Relevant user memories', userHits),
    ].join('\n\n')

    return {
      project: projectDoc
        ? {
            id: projectDoc._id.toString(),
            name: projectDoc.name,
            description: projectDoc.description,
          }
        : null,
      projectHits: projectHits.map(({ contentHash: _contentHash, ...hit }) => hit),
      threadHits: threadHits.map(({ contentHash: _contentHash, ...hit }) => hit),
      userHits: userHits.map(({ contentHash: _contentHash, ...hit }) => hit),
      text,
    }
  },
})
