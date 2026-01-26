// High-level agent functions
// Simplified implementation that works with local schema

import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from '../_generated/server'

// Create a new thread with user ownership
export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    sectionId: v.optional(v.id('sections')),
    emoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const threadId = await ctx.db.insert('threads', {
      userId,
      title: args.title,
      status: 'active',
    })

    // Note: sectionId and emoji are handled by the calling code
    // which may use threadMetadata table or add them directly to threads

    return threadId
  },
})

// Save a message to a thread
export const saveMessage = mutation({
  args: {
    threadId: v.id('threads'),
    content: v.string(),
    role: v.union(v.literal('user'), v.literal('assistant')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Verify thread ownership
    const thread = await ctx.db.get("threads", args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found')
    }

    // Get the last order number
    const lastMessage = await ctx.db
      .query('messages')
      .withIndex('threadId_status_tool_order_stepOrder', (q) =>
        q.eq('threadId', args.threadId).eq('status', 'success'),
      )
      .order('desc')
      .first()

    const order = (lastMessage?.order ?? -1) + 1

    // Save the message
    const messageId = await ctx.db.insert('messages', {
      threadId: args.threadId,
      userId,
      order,
      stepOrder: 0,
      status: 'success',
      text: args.content,
      tool: false,
      message: {
        role: args.role,
        content: args.content,
      },
    })

    return messageId
  },
})

// List threads for the current user
export const listThreads = query({
  args: {
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    const threads = await ctx.db
      .query('threads')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(args.paginationOpts.numItems)

    return {
      page: threads,
      isDone: threads.length < args.paginationOpts.numItems,
      continueCursor: threads.length > 0 ? threads[threads.length - 1]._id : '',
    }
  },
})

// List messages for a thread
export const listMessages = query({
  args: {
    threadId: v.id('threads'),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    // Verify thread ownership
    const thread = await ctx.db.get("threads", args.threadId)
    if (!thread || thread.userId !== userId) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('threadId_status_tool_order_stepOrder', (q) =>
        q
          .eq('threadId', args.threadId)
          .eq('status', 'success')
          .eq('tool', false),
      )
      .order('asc')
      .take(args.paginationOpts.numItems)

    return {
      page: messages,
      isDone: messages.length < args.paginationOpts.numItems,
      continueCursor: messages.length > 0 ? messages[messages.length - 1]._id : '',
    }
  },
})

// Delete a thread
export const deleteThread = mutation({
  args: { threadId: v.id('threads') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const thread = await ctx.db.get("threads", args.threadId)
    if (!thread || thread.userId !== userId) {
      throw new Error('Thread not found')
    }

    // Delete all messages in the thread
    const messages = await ctx.db
      .query('messages')
      .withIndex('threadId_status_tool_order_stepOrder', (q) =>
        q.eq('threadId', args.threadId),
      )
      .collect()

    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    // Delete the thread
    await ctx.db.delete(args.threadId)
  },
})
