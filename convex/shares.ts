import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import { getAuthUserId } from './lib/auth'
import { extractTextFromParts, normalizeChatThreadId } from './lib/chatEngine'

const sharedChatMessageValidator = v.object({
  order: v.number(),
  role: v.union(v.literal('user'), v.literal('assistant')),
  text: v.string(),
})

async function getOwnedThread(
  ctx: Pick<MutationCtx, 'db'>,
  threadId: string,
  userId: Id<'users'>,
) {
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

async function listShareableMessages(ctx: Pick<MutationCtx, 'db'>, threadId: Id<'chatThreads'>) {
  const messages: Array<{
    order: number
    role: 'user' | 'assistant'
    text: string
  }> = []

  const rows = await ctx.db
    .query('chatMessages')
    .withIndex('by_thread_order', (q) => q.eq('threadId', threadId))
    .order('asc')
    .filter((q) => q.eq(q.field('status'), 'success'))
    .take(500)

  for (const message of rows) {
    const role = message.message?.role
    const text = message.text ?? extractTextFromParts(message.parts)

    if (!text || (role !== 'user' && role !== 'assistant')) {
      continue
    }

    messages.push({
      order: messages.length,
      role,
      text,
    })
  }

  return messages
}

function createShareToken() {
  return crypto.randomUUID().replace(/-/g, '')
}

export const createOrUpdateChatShare = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    const thread = await getOwnedThread(ctx, args.threadId, userId)
    if (!thread) return null

    const messages = await listShareableMessages(ctx, thread._id)

    if (messages.length === 0) {
      return null
    }

    const title = thread.title?.trim() || 'Shared chat'
    const now = Date.now()
    const token = createShareToken()
    const shareId = await ctx.db.insert('chatShares', {
      threadId: args.threadId,
      ownerUserId: userId,
      token,
      title,
      createdAt: now,
      updatedAt: now,
      messageCount: messages.length,
    })

    await Promise.all(
      messages.map((message) =>
        ctx.db.insert('chatShareMessages', {
          shareId,
          order: message.order,
          role: message.role,
          text: message.text,
        }),
      ),
    )

    return {
      token,
      title,
      messageCount: messages.length,
    }
  },
})

export const getChatShare = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      title: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      messageCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query('chatShares')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!share) {
      return null
    }

    return {
      title: share.title?.trim() || 'Shared chat',
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
      messageCount: share.messageCount,
    }
  },
})

export const listChatShareMessages = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(sharedChatMessageValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query('chatShares')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!share) {
      return {
        page: [],
        isDone: true,
        continueCursor: '',
      }
    }

    const page = await ctx.db
      .query('chatShareMessages')
      .withIndex('by_share_order', (q) => q.eq('shareId', share._id))
      .paginate(args.paginationOpts)

    return {
      page: page.page.map((message) => ({
        order: message.order,
        role: message.role,
        text: message.text,
      })),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})
