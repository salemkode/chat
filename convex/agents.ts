import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { action, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { createThread as localCreateThread } from './agent'

// Random emoji picker for new chats
const CHAT_EMOJIS = [
  '💬',
  '🗨️',
  '💭',
  '🧠',
  '✨',
  '🚀',
  '🎯',
  '💡',
  '🔮',
  '🌟',
  '🎨',
  '📝',
  '🔥',
  '⚡',
  '🌈',
  '🎭',
  '🎪',
  '🎬',
  '🎵',
  '🎮',
  '🤖',
  '👾',
  '🦄',
  '🦋',
  '🌸',
  '🍀',
  '🌙',
  '☀️',
  '🌊',
  '🏔️',
]

export function getRandomEmoji(): string {
  return CHAT_EMOJIS[Math.floor(Math.random() * CHAT_EMOJIS.length)]
}

// Create OpenRouter provider with API key from environment
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

// Simple message generation without the full Agent class
// This is a temporary implementation - for full functionality you'd need
// to copy the entire Agent class or use @convex-dev/agent
export const generateMessage = action({
  args: {
    threadId: v.id('threads'),
    text: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // For now, just save the user message
    // TODO: Implement actual AI generation with streaming
    const { saveMessage } = await import('./agent/functions')
    await ctx.runMutation(saveMessage, {
      threadId: args.threadId,
      content: args.text,
      role: 'user',
    })

    // You would need to implement the AI streaming logic here
    // This requires either:
    // 1. Copying the full Agent class from @convex-dev/agent
    // 2. Implementing your own streaming logic
    // 3. Using @convex-dev/agent for the backend only

    throw new Error('AI generation not yet implemented - need to copy Agent class')
  },
})

export const createChatThread = mutation({
  args: {
    title: v.optional(v.string()),
    sectionId: v.optional(v.id('sections')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const threadId = await localCreateThread(ctx, {
      title: args.title,
      sectionId: args.sectionId,
      emoji: getRandomEmoji(),
    })

    return threadId
  },
})

// Update thread section
export const updateThreadSection = mutation({
  args: {
    threadId: v.id('threads'),
    sectionId: v.optional(v.id('sections')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Check if threadMetadata table exists
    try {
      const metadata = await ctx.db
        .query('threadMetadata')
        .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
        .first()

      if (!metadata || metadata.userId !== userId) {
        throw new Error('Thread not found')
      }

      await ctx.db.patch("threadMetadata", metadata._id, { sectionId: args.sectionId })
    } catch (e) {
      // threadMetadata might not exist or no index
      // Skip silently
    }
  },
})

// List threads with metadata (grouped by section)
export const listThreadsWithMetadata = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const threads = await ctx.db
      .query('threads')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(100)

    // Try to get metadata if the table exists
    let metadata: any[] = []
    try {
      metadata = await ctx.db
        .query('threadMetadata')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect()
    } catch (e) {
      // threadMetadata table might not exist
    }

    return threads.map((thread) => ({
      ...thread,
      metadata: metadata.find((m) => m.threadId === thread._id),
    }))
  },
})
