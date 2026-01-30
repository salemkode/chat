import { components, internal } from './_generated/api'
import { Agent } from '@convex-dev/agent'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { internalAction, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { createThread } from '@convex-dev/agent'
import type { LanguageModel } from 'ai'
import { match } from 'ts-pattern'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { azure } from '@ai-sdk/azure'
import { groq } from '@ai-sdk/groq'
import { deepseek } from '@ai-sdk/deepseek'
import { xai } from '@ai-sdk/xai'

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

function createAuthorAgent(
  model: LanguageModel,
) {
  return new Agent(components.agent, {
    name: 'Author',
    languageModel: model,
    maxSteps: 10, // Alternative to stopWhen: stepCountIs(10)
  })
}

export const streamMessage = internalAction({
  args: {
    agent: v.union(v.literal('openrouter'), v.literal('openai'), v.literal('anthropic'), v.literal('google'), v.literal('azure'), v.literal('groq'), v.literal('deepseek'), v.literal('xai')),
    modelId: v.string(),
    prompt: v.string(),
    threadId: v.string(),
    customUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const provider = match(args.agent)
      .with('openrouter', () => {
        return openrouter.chat(args.modelId)
      })
      .with('openai', () => {
        if (!args.customUrl || !args.apiKey) return openai.chat(args.modelId);
        const provider = createOpenAICompatible({
          name: 'providerName',
          apiKey: args.apiKey,
          baseURL:  args.customUrl,
          includeUsage: true, // Include usage information in streaming responses
        })
        return provider(args.modelId);
      })
      .with('anthropic', () => {
        return anthropic.languageModel(args.modelId)
      })
      .with('google', () => {
        return google.chat(args.modelId)
      })
      .with('azure', () => {
        return azure.chat(args.modelId)
      })
      .with('groq', () => {
        return groq(args.modelId)
      })
      .with('deepseek', () => {
        return deepseek.chat(args.modelId)
      })
      .with('xai', () => {
        return xai.chat(args.modelId)
      })
      .exhaustive()

    // Create the agent
    const agent = createAuthorAgent(provider)

    // Stream the response
    await agent.streamText(
      ctx,
      { threadId: args.threadId },
      // @ts-expect-error types are strict
      { prompt: args.prompt },
      { saveStreamDeltas: true },
    )
  },
})

export const generateMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    modelId: v.id('models'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const model = await ctx.db.get(args.modelId)
    if (!model) throw new Error('Model not found');

    const provider = await ctx.db.get(model.providerId)
    if (!provider) throw new Error('Provider not found');

    // Use the agent to stream the response
    await ctx.scheduler.runAfter(0, internal.agents.streamMessage, {
      agent: provider.providerType,
      modelId: model.modelId,
      prompt: args.prompt,
      threadId: args.threadId,
      apiKey: provider.apiKey,
      customUrl: provider.baseURL,
    })
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
      sortOrder: 0, // Default to not pinned
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

    await ctx.db.patch("threadMetadata", metadata._id, { sectionId: args.sectionId })
  },
})

// Toggle pin status for a thread
export const togglePinThread = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }

    // Find the metadata for this thread
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata) {
      throw new Error("Thread metadata not found")
    }

    if (metadata.userId !== userId) {
      throw new Error("Not authorized to pin this thread")
    }

    // Toggle between 0 (not pinned) and 1 (pinned)
    const newSortOrder = metadata.sortOrder === 1 ? 0 : 1

    await ctx.db.patch("threadMetadata", metadata._id, {
      sortOrder: newSortOrder
    })

    return newSortOrder
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
      .withIndex('by_userId_sortOrder', (q) => q.eq('userId', userId))
      .collect()

    // Sort threads: pinned (sortOrder=1) first, then by creation time
    const sortedMetadata = metadata.sort((a, b) => {
      // First sort by pinned status (descending - pinned first)
      if (b.sortOrder !== a.sortOrder) {
        return b.sortOrder - a.sortOrder
      }
      // Then sort by creation time (newest first)
      return b._creationTime - a._creationTime
    })

    return threads.page.map((thread) => ({
      ...thread,
      metadata: sortedMetadata.find((m) => m.threadId === thread._id),
    }))
  },
})
