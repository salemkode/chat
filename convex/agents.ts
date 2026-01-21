import { components } from './_generated/api'
import { Agent } from '@convex-dev/agent'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { action, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { createThread } from '@convex-dev/agent'

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

export const chatAgent = new Agent(components.agent, {
  name: 'chat',
  languageModel: openrouter.chat('mistralai/devstral-2512:free'),
  instructions: 'You are a helpful assistant.',
})

export const generateMessage = action({
  args: {
    threadId: v.string(),
    text: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Dynamic model selection via OpenRouter
    // User can pass model names like "openai/gpt-4o", "anthropic/claude-3-opus", etc.
    const modelId = args.model || 'mistralai/devstral-2512:free'
    const model = openrouter.chat(modelId)

    // Use the agent to stream the response
    await chatAgent.streamText(
      ctx,
      { threadId: args.threadId },
      // @ts-expect-error types are strict
      { prompt: args.text },
      {
        saveStreamDeltas: true,
        languageModel: model,
      },
    )
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
    const threadId = await createThread(ctx, components.agent, {
      title: args.title,
      userId,
    })

    // Create thread metadata with random emoji
    await ctx.db.insert('threadMetadata', {
      threadId,
      emoji: getRandomEmoji(),
      sectionId: args.sectionId,
      userId,
      title: args.title || 'New chat',
      mode: 'think',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      metadata: {
        messageCount: 0,
        isPinned: false,
      },
    })

    return threadId
  },
})

// Update thread section
export const updateThreadSection = mutation({
  args: {
    threadId: v.string(),
    sectionId: v.optional(v.id('sections')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata || metadata.userId !== userId) {
      throw new Error('Thread not found')
    }

    await ctx.db.patch('threadMetadata', metadata._id, {
      sectionId: args.sectionId,
    })
  },
})

// List threads with metadata (grouped by section)
export const listThreadsWithMetadata = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId,
        paginationOpts: { numItems: 100, cursor: null },
      },
    )

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect()

    return threads.page.map((thread) => ({
      ...thread,
      metadata: metadata.find((m) => m.threadId === thread._id),
    }))
  },
})
