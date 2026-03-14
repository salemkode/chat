import { embedMany } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { v, ConvexError } from 'convex/values'
import { action, internalQuery } from './_generated/server'
import { components, internal } from './_generated/api'
import { getAuthUserId } from './lib/auth'
import { extractMessageText } from './functions/memoryShared'

const SEARCH_EMBEDDING_MODEL = 'openai/text-embedding-3-small'
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

function clampLimit(limit?: number) {
  return Math.max(1, Math.min(limit ?? 8, 12))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSnippet(text: string, query: string, maxLength = 180) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  const match = query.trim()
    ? normalized.search(new RegExp(escapeRegExp(query.trim()), 'i'))
    : -1

  if (match < 0) {
    return `${normalized.slice(0, maxLength).trimEnd()}...`
  }

  const idealStart = Math.max(0, match - Math.floor(maxLength * 0.32))
  const start = Math.min(idealStart, Math.max(0, normalized.length - maxLength))
  const end = Math.min(normalized.length, start + maxLength)

  return `${start > 0 ? '...' : ''}${normalized.slice(start, end).trim()}${end < normalized.length ? '...' : ''}`
}

export const getSearchUserId = internalQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    return await getAuthUserId(ctx)
  },
})

export const getThreadSearchMetadata = internalQuery({
  args: {
    userId: v.string(),
    threadIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      threadId: v.string(),
      threadTitle: v.string(),
      projectId: v.optional(v.string()),
      projectName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const threads = await Promise.all(
      args.threadIds.map(async (threadId) => {
        const [thread, metadata] = await Promise.all([
          ctx.runQuery(components.agent.threads.getThread, { threadId }),
          ctx.db
            .query('threadMetadata')
            .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
            .first(),
        ])

        const project =
          metadata?.projectId && metadata.userId === args.userId
            ? await ctx.db.get(metadata.projectId)
            : null

        return {
          threadId,
          threadTitle: thread?.title?.trim() || 'Untitled chat',
          projectId: project?._id.toString(),
          projectName: project?.name,
        }
      }),
    )

    return threads
  },
})

export const searchSidebar = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      messageId: v.string(),
      threadId: v.string(),
      threadTitle: v.string(),
      projectId: v.optional(v.string()),
      projectName: v.optional(v.string()),
      snippet: v.string(),
      createdAt: v.number(),
      role: v.union(v.literal('user'), v.literal('assistant')),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await ctx.runQuery(internal.sidebarSearch.getSearchUserId, {})
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to search chats',
      })
    }

    const query = args.query.trim()
    if (!query) {
      return []
    }

    const limit = clampLimit(args.limit)
    const vectorSearchEnabled = Boolean(process.env.OPENROUTER_API_KEY)
    const embedding = vectorSearchEnabled
      ? (
          await embedMany({
            model: openrouter.textEmbeddingModel(SEARCH_EMBEDDING_MODEL),
            values: [query],
          })
        ).embeddings[0]
      : undefined

    const results = await ctx.runAction(components.agent.messages.searchMessages, {
      searchAllMessagesForUserId: userId,
      text: query,
      textSearch: true,
      vectorSearch: vectorSearchEnabled,
      embedding,
      embeddingModel: vectorSearchEnabled ? SEARCH_EMBEDDING_MODEL : undefined,
      limit,
    })

    const threadIds = Array.from(
      new Set(results.map((result) => result.threadId).filter(Boolean)),
    )

    const threads = await ctx.runQuery(internal.sidebarSearch.getThreadSearchMetadata, {
      userId,
      threadIds,
    })

    const threadMap = new Map(
      threads.map((thread) => [
        thread.threadId,
        {
          threadTitle: thread.threadTitle,
          projectId: thread.projectId,
          projectName: thread.projectName,
        },
      ]),
    )

    return results
      .filter(
        (result): result is (typeof results)[number] & {
          message: {
            role: 'user' | 'assistant'
          }
        } =>
          result.message?.role === 'user' || result.message?.role === 'assistant',
      )
      .map((result) => {
        const text = extractMessageText(result)
        const thread = threadMap.get(result.threadId)

        return {
          messageId: result._id,
          threadId: result.threadId,
          threadTitle: thread?.threadTitle || 'Untitled chat',
          projectId: thread?.projectId,
          projectName: thread?.projectName,
          snippet: buildSnippet(text, query),
          createdAt: result._creationTime,
          role: result.message.role,
        }
      })
      .filter((result) => result.snippet.length > 0)
  },
})
