import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import {
  buildStoredMessage,
  extractTextFromParts,
  publicChatMessage,
  publicStreamingMessage,
} from './lib/chatEngine'

export const createStream = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    userId: v.optional(v.id('users')),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(v.any()),
    order: v.number(),
    stepOrder: v.number(),
  },
  returns: v.id('chatStreamingMessages'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('chatStreamingMessages', {
      ...args,
      format: 'UIMessageChunk',
      state: {
        kind: 'streaming',
        lastHeartbeat: Date.now(),
      },
    })
  },
})

export const appendStreamDelta = internalMutation({
  args: {
    streamId: v.id('chatStreamingMessages'),
    start: v.number(),
    end: v.number(),
    parts: v.array(v.any()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId)
    if (!stream || stream.state.kind !== 'streaming') {
      return false
    }

    await ctx.db.insert('chatStreamDeltas', args)
    await ctx.db.patch(args.streamId, {
      state: {
        kind: 'streaming',
        lastHeartbeat: Date.now(),
      },
    })
    return true
  },
})

export const finalizeAssistantMessage = internalMutation({
  args: {
    messageId: v.id('chatMessages'),
    streamId: v.id('chatStreamingMessages'),
    parts: v.array(v.any()),
    text: v.string(),
    usage: v.optional(v.any()),
    providerMetadata: v.optional(v.any()),
    finishReason: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const [message, stream] = await Promise.all([
      ctx.db.get(args.messageId),
      ctx.db.get(args.streamId),
    ])
    if (!message || message.status !== 'pending') {
      return false
    }
    if (!stream || stream.state.kind !== 'streaming') {
      return false
    }

    await ctx.db.patch(args.messageId, {
      status: 'success',
      text: args.text,
      parts: args.parts,
      message: buildStoredMessage('assistant', args.parts),
      usage: args.usage,
      providerMetadata: args.providerMetadata,
      finishReason: args.finishReason,
      error: undefined,
    })
    await ctx.db.patch(args.streamId, {
      state: {
        kind: 'finished',
        endedAt: Date.now(),
      },
    })
    return true
  },
})

export const storeMessageEmbedding = internalMutation({
  args: {
    messageId: v.id('chatMessages'),
    vector: v.array(v.number()),
    model: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId)
    if (!message || !message.userId) {
      return null
    }

    const embeddingId = await ctx.db.insert('chatMessageEmbeddings', {
      vector: args.vector,
      model: args.model,
      userId: message.userId,
      threadId: message.threadId,
      messageId: message._id,
      createdAt: Date.now(),
    })

    await ctx.db.patch(message._id, {
      embeddingId,
    })

    return null
  },
})

export const failPendingMessagesByOrder = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    order: v.number(),
    error: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const pendingMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_status_order', (q) =>
        q.eq('threadId', args.threadId).eq('status', 'pending').eq('order', args.order),
      )
      .collect()

    for (const message of pendingMessages) {
      await ctx.db.patch(message._id, {
        status: 'failed',
        error: args.error,
      })
    }

    const streams = await ctx.db
      .query('chatStreamingMessages')
      .withIndex('by_thread_state_order', (q) =>
        q.eq('threadId', args.threadId).eq('state.kind', 'streaming').eq('order', args.order),
      )
      .collect()

    for (const stream of streams) {
      await ctx.db.patch(stream._id, {
        state: {
          kind: 'aborted',
          reason: args.error,
        },
      })
    }

    return pendingMessages.length
  },
})

export const deleteResponseStepsForPrompt = internalMutation({
  args: {
    threadId: v.id('chatThreads'),
    promptOrder: v.number(),
    promptStepOrder: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_order', (q) =>
        q.eq('threadId', args.threadId).eq('order', args.promptOrder),
      )
      .collect()

    for (const message of messages) {
      if (message.stepOrder > args.promptStepOrder) {
        await ctx.db.delete(message._id)
      }
    }

    const streams = await ctx.db
      .query('chatStreamingMessages')
      .withIndex('by_thread_state_order', (q) =>
        q.eq('threadId', args.threadId).eq('state.kind', 'streaming').eq('order', args.promptOrder),
      )
      .collect()

    for (const stream of streams) {
      await ctx.db.patch(stream._id, {
        state: {
          kind: 'aborted',
          reason: 'Regenerating response.',
        },
      })
    }

    return null
  },
})

export const getMessagesByIds = internalQuery({
  args: {
    messageIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.messageIds.map(async (messageId) => {
        const normalized = ctx.db.normalizeId('chatMessages', messageId)
        return normalized ? await ctx.db.get(normalized) : null
      }),
    )
  },
})

export const getThreadById = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId('chatThreads', args.threadId)
    return threadId ? await ctx.db.get(threadId) : null
  },
})

export const listContextMessages = internalQuery({
  args: {
    threadId: v.id('chatThreads'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_order', (q) => q.eq('threadId', args.threadId))
      .order('desc')
      .filter((q) => q.eq(q.field('status'), 'success'))
      .take(args.limit ?? 40)

    return messages
      .reverse()
      .flatMap((message) => {
        const publicMessage = publicChatMessage(message)
        return publicMessage ? [publicMessage] : []
      })
  },
})

export const listMessagesAfterOrder = internalQuery({
  args: {
    threadId: v.string(),
    afterOrder: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threadId = ctx.db.normalizeId('chatThreads', args.threadId)
    if (!threadId) {
      return []
    }

    return await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_order', (q) => q.eq('threadId', threadId).gt('order', args.afterOrder))
      .order('asc')
      .filter((q) => q.eq(q.field('status'), 'success'))
      .take(args.limit ?? 200)
  },
})

export const listPendingMessagesForThread = internalQuery({
  args: {
    threadId: v.id('chatThreads'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_status_order', (q) =>
        q.eq('threadId', args.threadId).eq('status', 'pending'),
      )
      .order('desc')
      .take(args.limit ?? 20)

    return {
      page: messages,
    }
  },
})

export const listStreamingMessagesForThread = internalQuery({
  args: {
    threadId: v.id('chatThreads'),
    startOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const streams = await ctx.db
      .query('chatStreamingMessages')
      .withIndex('by_thread_state_order', (q) =>
        q
          .eq('threadId', args.threadId)
          .eq('state.kind', 'streaming')
          .gte('order', args.startOrder ?? 0),
      )
      .collect()

    return await Promise.all(
      streams.map(async (stream) => {
        const deltas = await ctx.db
          .query('chatStreamDeltas')
          .withIndex('by_stream_start', (q) => q.eq('streamId', stream._id))
          .order('asc')
          .take(1000)
        const chunks = deltas.flatMap((delta) => delta.parts)
        return publicStreamingMessage({
          threadId: stream.threadId,
          streamId: stream._id,
          creationTime: stream._creationTime,
          order: stream.order,
          stepOrder: stream.stepOrder,
          status: stream.state.kind,
          agentName: stream.agentName,
          userId: stream.userId,
          chunks,
        })
      }),
    )
  },
})

export const getConversationSnapshot = internalQuery({
  args: {
    threadId: v.id('chatThreads'),
    pendingPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_thread_order', (q) => q.eq('threadId', args.threadId))
      .order('asc')
      .filter((q) => q.eq(q.field('status'), 'success'))
      .take(200)

    let messageCount = 0
    let firstUserMessage = ''
    const recentMessages: Array<{ role: string; text: string }> = []

    for (const message of messages) {
      const role = message.message?.role
      const text = message.text ?? extractTextFromParts(message.parts)
      if (!text || (role !== 'user' && role !== 'assistant')) {
        continue
      }

      messageCount += 1
      if (!firstUserMessage && role === 'user') {
        firstUserMessage = text
      }

      recentMessages.push({ role, text })
      if (recentMessages.length > 8) {
        recentMessages.shift()
      }
    }

    const trimmedPrompt = args.pendingPrompt.trim()
    if (trimmedPrompt) {
      messageCount += 1
      if (!firstUserMessage) {
        firstUserMessage = trimmedPrompt
      }
      recentMessages.push({ role: 'user', text: trimmedPrompt })
      if (recentMessages.length > 8) {
        recentMessages.shift()
      }
    }

    return {
      messageCount,
      firstUserMessage,
      recentTranscript: recentMessages
        .map((message) => `${message.role}: ${message.text.replace(/\s+/g, ' ').slice(0, 180)}`)
        .join('\n'),
    }
  },
})
