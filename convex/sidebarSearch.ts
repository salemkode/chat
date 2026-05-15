import { embedMany } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { v } from 'convex/values'
import { action, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { getAuthUserId } from './lib/auth'
import { extractTextFromParts, normalizeChatThreadId } from './lib/chatEngine'

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

  const match = query.trim() ? normalized.search(new RegExp(escapeRegExp(query.trim()), 'i')) : -1

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
  returns: v.union(v.id('users'), v.null()),
  handler: async (ctx) => {
    return await getAuthUserId(ctx)
  },
})

export const getThreadSearchMetadata = internalQuery({
  args: {
    userId: v.id('users'),
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
        const normalizedThreadId = normalizeChatThreadId(ctx, threadId)
        if (!normalizedThreadId) {
          return null
        }

        const [thread, metadata] = await Promise.all([
          ctx.db.get(normalizedThreadId),
          ctx.db
            .query('threadMetadata')
            .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
            .first(),
        ])

        if (!thread || thread.userId !== args.userId) {
          return null
        }

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

    return threads.filter((thread): thread is NonNullable<typeof thread> => thread !== null)
  },
})

export const searchMessagesByText = internalQuery({
  args: {
    userId: v.id('users'),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('chatMessages')
      .withSearchIndex('text_search', (q) => q.search('text', args.query).eq('userId', args.userId))
      .take(args.limit)
  },
})

export const getEmbeddingMessages = internalQuery({
  args: {
    embeddingIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.embeddingIds.map(async (embeddingId) => {
        const normalized = ctx.db.normalizeId('chatMessageEmbeddings', embeddingId)
        return normalized ? await ctx.db.get(normalized) : null
      }),
    )
    const messageIds = rows.flatMap((row) => (row?.messageId ? [row.messageId] : []))
    return await Promise.all(messageIds.map((messageId) => ctx.db.get(messageId)))
  },
})

export const searchSidebar = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.runQuery(internal.sidebarSearch.getSearchUserId, {})
    if (!userId) {
      return []
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

    const textResults = await ctx.runQuery(internal.sidebarSearch.searchMessagesByText, {
      userId,
      query,
      limit,
    })
    const vectorResults =
      vectorSearchEnabled && embedding
        ? await ctx.vectorSearch('chatMessageEmbeddings', 'by_embedding', {
            vector: embedding,
            limit,
            filter: (q) => q.eq('userId', userId),
          })
        : []
    const vectorMessages = await ctx.runQuery(internal.sidebarSearch.getEmbeddingMessages, {
      embeddingIds: vectorResults.map((result) => result._id),
    })
    const resultMap = new Map(
      [...textResults, ...vectorMessages]
        .filter((message): message is NonNullable<typeof message> => message !== null)
        .map((message) => [message._id.toString(), message]),
    )
    const results = Array.from(resultMap.values()).slice(0, limit)

    const threadIds = Array.from(new Set(results.map((result) => result.threadId).filter(Boolean)))

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
        (
          result,
        ): result is (typeof results)[number] & {
          message: {
            role: 'user' | 'assistant'
          }
        } => result.message?.role === 'user' || result.message?.role === 'assistant',
      )
      .map((result) => {
        const text = result.text ?? extractTextFromParts(result.parts)
        const threadId = result.threadId.toString()
        const thread = threadMap.get(threadId)

        return {
          messageId: result._id,
          threadId,
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
