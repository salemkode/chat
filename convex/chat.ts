import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import { mutation, query, type QueryCtx } from './_generated/server'
import { getAuthUserId } from './lib/auth'
import { threadMetadataValidator } from './lib/validators'
import { GENERATION_STOPPED_BY_USER } from './agents'
import { canViewProject, getProjectRole } from './lib/projectAccess'
import { normalizeChatThreadId, publicChatMessage } from './lib/chatEngine'

const threadDetailValidator = v.union(
  v.null(),
  v.object({
    _id: v.string(),
    _creationTime: v.number(),
    lastMessageAt: v.number(),
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
    metadata: v.union(v.null(), threadMetadataValidator),
    project: v.union(
      v.null(),
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
      }),
    ),
  }),
)

function emptyMessagesPage() {
  return { page: [], isDone: true, continueCursor: '' }
}

async function canReadThread(ctx: QueryCtx, threadId: string, userId: string) {
  const normalizedThreadId = normalizeChatThreadId(ctx, threadId)
  if (!normalizedThreadId) {
    return null
  }

  const thread = await ctx.db.get(normalizedThreadId)
  if (!thread || thread.userId !== userId) {
    return null
  }

  return thread
}

export const listThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    const threads = await ctx.db
      .query('chatThreads')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .paginate(args.paginationOpts)

    return {
      ...threads,
      page: threads.page.map((thread) => ({
        _id: thread._id,
        _creationTime: thread._creationTime,
        title: thread.title,
        summary: thread.summary,
        status: thread.status,
        userId: thread.userId?.toString(),
      })),
    }
  },
})

export const deleteThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const threadId = normalizeChatThreadId(ctx, args.threadId)
    if (!threadId) {
      return null
    }

    const thread = await ctx.db.get(threadId)
    if (!thread || thread.userId !== userId) {
      return null
    }

    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_order', (q) => q.eq('threadId', threadId))
      .take(500)
    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    const streams = await ctx.db
      .query('chatStreamingMessages')
      .withIndex('by_thread_state_order', (q) => q.eq('threadId', threadId))
      .take(500)
    for (const stream of streams) {
      const deltas = await ctx.db
        .query('chatStreamDeltas')
        .withIndex('by_stream_start', (q) => q.eq('streamId', stream._id))
        .take(1000)
      for (const delta of deltas) {
        await ctx.db.delete(delta._id)
      }
      await ctx.db.delete(stream._id)
    }

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()
    if (metadata) {
      await ctx.db.delete(metadata._id)
    }

    await ctx.db.delete(threadId)
    return null
  },
})

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !args.threadId) {
      return emptyMessagesPage()
    }

    const thread = await canReadThread(ctx, args.threadId, userId)
    if (!thread) {
      return emptyMessagesPage()
    }

    const paginated = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_order', (q) => q.eq('threadId', thread._id))
      .order('desc')
      .paginate(args.paginationOpts)

    const failedErrorsByOrder = new Map<number, string>()
    for (const message of paginated.page) {
      if (message.status === 'failed' && message.error) {
        failedErrorsByOrder.set(message.order, message.error)
      }
    }

    return {
      ...paginated,
      page: paginated.page.flatMap((message) => {
        const failure =
          message.status === 'failed'
            ? buildFailureMetadata(failedErrorsByOrder.get(message.order), message.text)
            : undefined
        const publicMessage = publicChatMessage(message, failure)
        return publicMessage ? [publicMessage] : []
      }),
    }
  },
})

export const listStreamingMessages = query({
  args: {
    threadId: v.string(),
    startOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !args.threadId) {
      return []
    }

    const thread = await canReadThread(ctx, args.threadId, userId)
    if (!thread) {
      return []
    }

    return await ctx.runQuery(internal.chatEngine.listStreamingMessagesForThread, {
      threadId: thread._id,
      startOrder: args.startOrder,
    })
  },
})

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return ''
    }

    return await ctx.db.insert('chatThreads', {
      userId,
      status: 'active',
    })
  },
})

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  returns: threadDetailValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId || !args.threadId) {
      return null
    }

    const threadId = normalizeChatThreadId(ctx, args.threadId)
    if (!threadId) {
      return null
    }

    const thread = await ctx.db.get(threadId)
    if (!thread || thread.userId !== userId) {
      return null
    }

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', thread._id))
      .first()

    const project = metadata?.projectId ? await ctx.db.get(metadata.projectId) : null
    const role =
      project && metadata?.projectId ? await getProjectRole(ctx, metadata.projectId, userId) : null

    return {
      _id: thread._id,
      _creationTime: thread._creationTime,
      lastMessageAt: metadata?.lastMessageAt ?? thread._creationTime,
      title: thread.title,
      userId: thread.userId?.toString(),
      metadata: metadata ?? null,
      project:
        project && canViewProject(role)
          ? {
              id: project._id.toString(),
              name: project.name,
              description: project.description,
            }
          : null,
    }
  },
})

type FailureKind = 'stopped' | 'error'
type FailureMode = 'replace' | 'clarify'

function buildFailureMetadata(
  error: string | undefined,
  text: string | undefined,
): {
  kind: FailureKind
  mode: FailureMode
  note: string
} {
  const kind: FailureKind = isStoppedFailure(error) ? 'stopped' : 'error'
  const hasGeneratedContent = Boolean(text?.trim())
  const mode: FailureMode = hasGeneratedContent ? 'clarify' : 'replace'
  const locale = inferFailureLocale(text, error)

  if (kind === 'stopped') {
    return {
      kind,
      mode,
      note: 'Generation stopped.',
    }
  }

  const cleaned = sanitizeFailedMessage(error, locale)

  return {
    kind,
    mode,
    note: cleaned || 'This message failed to generate.',
  }
}

function isStoppedFailure(error: string | undefined) {
  if (!error) {
    return false
  }

  const normalized = error.trim().toLowerCase()
  return (
    normalized === GENERATION_STOPPED_BY_USER.toLowerCase() ||
    normalized.includes('stopped by user') ||
    normalized === 'generation stopped.'
  )
}

function sanitizeFailedMessage(error: string | undefined, locale: 'en' | 'ar'): string {
  if (!error) {
    return ''
  }

  const normalized = error
    .replace(/\s*\[Request ID:[^\]]+\]\s*/g, ' ')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (isRetryableProviderRateLimit(normalized)) {
    return locale === 'ar'
      ? 'النموذج المحدد يواجه حالياً تقييداً مؤقتاً من المزود. يرجى إعادة المحاولة بعد قليل.'
      : 'The selected model is temporarily rate-limited upstream. Please try again shortly.'
  }

  const accessDeniedModel = extractAccessDeniedModel(normalized)
  if (accessDeniedModel) {
    return locale === 'ar'
      ? `حساب المزود الخاص بك لا يملك صلاحية الوصول إلى ${accessDeniedModel}. اختر نموذجاً آخر أو قم بترقية خطة المزود.`
      : `Your provider account does not have access to ${accessDeniedModel}. Choose another model or upgrade that provider plan.`
  }

  return normalized
    .replace(/Last error:\s*/gi, '')
    .replace(/Provider returned error/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferFailureLocale(
  text: string | undefined,
  error: string | undefined,
): 'en' | 'ar' {
  const sample = `${text ?? ''} ${error ?? ''}`
  return /[\u0600-\u06FF]/.test(sample) ? 'ar' : 'en'
}

function extractAccessDeniedModel(error: string) {
  const match =
    /does not yet include access to ([^.,]+?)(?:[.!]|$)/i.exec(error) ||
    /does not include access to ([^.,]+?)(?:[.!]|$)/i.exec(error)

  return match?.[1]?.trim()
}

function isRetryableProviderRateLimit(error: string) {
  const normalized = error.toLowerCase()
  return (
    normalized.includes('429') ||
    normalized.includes('rate-limited upstream') ||
    normalized.includes('maxretriesexceeded') ||
    normalized.includes('failed after 3 attempts') ||
    normalized.includes('retry shortly')
  )
}
