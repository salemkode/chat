import { omit } from 'convex-helpers'
import { paginator } from 'convex-helpers/server/pagination'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Doc, Id } from '../_generated/dataModel.js'
import { mutation, type MutationCtx, query } from '../_generated/server.js'

// Simplified MessageDoc type
export interface MessageDoc {
  _id: Id<'messages'>
  _creationTime: number
  userId?: Id<'users'>
  threadId: Id<'threads'>
  order: number
  stepOrder: number
  embeddingId?: Id<'v1536'>
  fileIds?: Id<'files'>[]
  error?: string
  status: 'pending' | 'success' | 'failed'
  agentName?: string
  model?: string
  provider?: string
  message?: any
  tool: boolean
  text?: string
  usage?: any
  finishReason?: any
}

function publicMessage(message: Doc<'messages'>): MessageDoc {
  return omit(message, ['parentMessageId', 'stepId', 'files'])
}

// Helper to get the next order number for a thread
async function getNextOrder(ctx: MutationCtx, threadId: Id<'threads'>) {
  const messages = await ctx.db
    .query('messages')
    .withIndex('threadId_status_tool_order_stepOrder', (q) =>
      q.eq('threadId', threadId),
    )
    .order('desc')
    .first()

  return messages ? messages.order + 1 : 0
}

// Create a new user message
export const createUserMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Verify thread ownership
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found')
    }

    const order = await getNextOrder(ctx, args.threadId)

    const messageId = await ctx.db.insert('messages', {
      userId,
      threadId: args.threadId,
      order,
      stepOrder: 0,
      status: 'success',
      message: {
        role: 'user',
        content: args.content,
      },
      text: args.content,
      tool: false,
    })

    return publicMessage((await ctx.db.get(messageId))!)
  },
  returns: v.object({
    _id: v.id('messages'),
    _creationTime: v.number(),
    userId: v.optional(v.id('users')),
    threadId: v.id('threads'),
    order: v.number(),
    stepOrder: v.number(),
    embeddingId: v.optional(v.id('v1536')),
    fileIds: v.optional(v.array(v.id('files'))),
    error: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('success'),
      v.literal('failed'),
    ),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    message: v.optional(v.any()),
    tool: v.boolean(),
    text: v.optional(v.string()),
    usage: v.optional(v.any()),
    finishReason: v.optional(v.any()),
  }),
})

// List messages for a thread
export const listMessages = query({
  args: {
    threadId: v.id('threads'),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    // Verify thread ownership
    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const messages = await paginator(ctx.db)
      .query('messages')
      .withIndex('threadId_status_tool_order_stepOrder', (q) =>
        q
          .eq('threadId', args.threadId)
          .eq('status', 'success')
          .eq('tool', false),
      )
      .order('asc')
      .paginate(args.paginationOpts ?? { cursor: null, numItems: 100 })

    return {
      ...messages,
      page: messages.page.map(publicMessage),
    }
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id('messages'),
        _creationTime: v.number(),
        userId: v.optional(v.id('users')),
        threadId: v.id('threads'),
        order: v.number(),
        stepOrder: v.number(),
        embeddingId: v.optional(v.id('v1536')),
        fileIds: v.optional(v.array(v.id('files'))),
        error: v.optional(v.string()),
        status: v.union(
          v.literal('pending'),
          v.literal('success'),
          v.literal('failed'),
        ),
        agentName: v.optional(v.string()),
        model: v.optional(v.string()),
        provider: v.optional(v.string()),
        message: v.optional(v.any()),
        tool: v.boolean(),
        text: v.optional(v.string()),
        usage: v.optional(v.any()),
        finishReason: v.optional(v.any()),
      }),
    ),
    continueCursor: v.string(),
    isDone: v.boolean(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal('SplitRecommended'),
        v.literal('SplitRequired'),
        v.null(),
      ),
    ),
  }),
})

// Get recent messages (for context)
export const getRecentMessages = query({
  args: {
    threadId: v.id('threads'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const thread = await ctx.db.get(args.threadId)
    if (!thread || thread.userId !== userId) {
      return []
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('threadId_status_tool_order_stepOrder', (q) =>
        q
          .eq('threadId', args.threadId)
          .eq('status', 'success')
          .eq('tool', false),
      )
      .order('desc')
      .take(args.limit ?? 10)

    return messages.reverse().map(publicMessage)
  },
  returns: v.array(
    v.object({
      _id: v.id('messages'),
      _creationTime: v.number(),
      userId: v.optional(v.id('users')),
      threadId: v.id('threads'),
      order: v.number(),
      stepOrder: v.number(),
      embeddingId: v.optional(v.id('v1536')),
      fileIds: v.optional(v.array(v.id('files'))),
      error: v.optional(v.string()),
      status: v.union(
        v.literal('pending'),
        v.literal('success'),
        v.literal('failed'),
      ),
      agentName: v.optional(v.string()),
      model: v.optional(v.string()),
      provider: v.optional(v.string()),
      message: v.optional(v.any()),
      tool: v.boolean(),
      text: v.optional(v.string()),
      usage: v.optional(v.any()),
      finishReason: v.optional(v.any()),
    }),
  ),
})

// Delete a message
export const deleteMessage = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const message = await ctx.db.get(args.messageId)
    if (!message) throw new Error('Message not found')

    // Verify ownership through thread
    const thread = await ctx.db.get(message.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(args.messageId)
  },
  returns: v.null(),
})

// Helper function to add messages (used by agent integration)
export async function addMessages(
  ctx: MutationCtx,
  args: {
    userId?: Id<'users'>
    threadId: Id<'threads'>
    messages: Array<{
      role: 'user' | 'assistant' | 'system'
      content: any
    }>
    metadata?: {
      model?: string
      provider?: string
      agentName?: string
      status?: 'pending' | 'success' | 'failed'
      error?: string
    }
  },
) {
  const thread = await ctx.db.get(args.threadId)
  if (!thread) throw new Error('Thread not found')

  const userId = args.userId ?? thread.userId
  let currentOrder = await getNextOrder(ctx, args.threadId)

  const results: MessageDoc[] = []

  for (const message of args.messages) {
    const isUser = message.role === 'user'

    const messageId = await ctx.db.insert('messages', {
      userId,
      threadId: args.threadId,
      order: currentOrder,
      stepOrder: 0,
      status: args.metadata?.status ?? (isUser ? 'success' : 'success'),
      error: args.metadata?.error,
      agentName: args.metadata?.agentName,
      model: args.metadata?.model,
      provider: args.metadata?.provider,
      message,
      text: typeof message.content === 'string' ? message.content : undefined,
      tool: message.role === 'tool',
    })

    results.push(publicMessage((await ctx.db.get(messageId))!))

    // User messages start a new order
    if (isUser) {
      currentOrder++
    }
  }

  return { messages: results }
}
