import { paginationOptsValidator, type FunctionReturnType } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { components } from './_generated/api'
import { mutation, query, type MutationCtx } from './_generated/server'
import { extractMessageText } from './functions/memoryShared'
import { getAuthUserId } from './lib/auth'

type ThreadMessageBatch = FunctionReturnType<
  typeof components.agent.messages.listMessagesByThreadId
>

const sharedChatMessageValidator = v.object({
  order: v.number(),
  role: v.union(v.literal('user'), v.literal('assistant')),
  text: v.string(),
})

function isInvalidThreadIdError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('does not match the table name in validator')
  )
}

async function getOwnedThread(
  ctx: Pick<MutationCtx, 'runQuery'>,
  threadId: string,
  userId: Id<'users'>,
) {
  let thread

  try {
    thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId,
    })
  } catch (error) {
    if (isInvalidThreadIdError(error)) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Thread not found',
      })
    }

    throw error
  }

  if (!thread || thread.userId !== userId) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Thread not found or you do not have access to it',
    })
  }

  return thread
}

async function listShareableMessages(
  ctx: Pick<MutationCtx, 'runQuery'>,
  threadId: string,
) {
  const messages: Array<{
    order: number
    role: 'user' | 'assistant'
    text: string
  }> = []
  let cursor: string | null = null

  while (true) {
    const batch: ThreadMessageBatch = await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId,
        order: 'asc',
        excludeToolMessages: true,
        statuses: ['success'],
        paginationOpts: {
          cursor,
          numItems: 100,
        },
      },
    )

    for (const message of batch.page) {
      const role = message.message?.role
      const text = extractMessageText(message)

      if (!text || (role !== 'user' && role !== 'assistant')) {
        continue
      }

      messages.push({
        order: messages.length,
        role,
        text,
      })
    }

    if (batch.isDone) {
      break
    }

    cursor = batch.continueCursor
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
  returns: v.object({
    token: v.string(),
    title: v.string(),
    messageCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to share chats',
      })
    }

    const thread = await getOwnedThread(ctx, args.threadId, userId)
    const messages = await listShareableMessages(ctx, args.threadId)

    if (messages.length === 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Only chats with messages can be shared',
      })
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
