import { components, internal } from './_generated/api'
import { Agent } from '@convex-dev/agent'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
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
import { ConvexError } from 'convex/values'
import type { Id } from './_generated/dataModel'

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

function createAuthorAgent(model: LanguageModel) {
  return new Agent(components.agent, {
    name: 'Author',
    languageModel: model,
    maxSteps: 10, // Alternative to stopWhen: stepCountIs(10)
  })
}

export const streamMessage = internalAction({
  args: {
    agent: v.union(
      v.literal('openrouter'),
      v.literal('openai'),
      v.literal('anthropic'),
      v.literal('google'),
      v.literal('azure'),
      v.literal('groq'),
      v.literal('deepseek'),
      v.literal('xai'),
      v.literal('openai-compatible'),
      v.literal('opencode'),
      v.literal('mistral'),
      v.literal('cohere'),
      v.literal('perplexity'),
      v.literal('fireworks'),
      v.literal('together'),
      v.literal('replicate'),
      v.literal('moonshot'),
      v.literal('qwen'),
      v.literal('stepfun'),
    ),
    modelId: v.string(),
    prompt: v.string(),
    threadId: v.string(),
    customUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    config: v.optional(
      v.object({
        organization: v.optional(v.string()),
        project: v.optional(v.string()),
        headers: v.optional(v.record(v.string(), v.string())),
        queryParams: v.optional(v.record(v.string(), v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    try {
      const provider = match(args.agent)
        .with('openrouter', () => {
          return openrouter.chat(args.modelId)
        })
        .with('openai', () => {
          return openai.chat(args.modelId)
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
        .with('openai-compatible', () => {
          // Generic OpenAI-compatible provider
          if (!args.customUrl || !args.apiKey) {
            throw new Error(
              'OpenAI-compatible provider requires customUrl and apiKey',
            )
          }
          const customProvider = createOpenAICompatible({
            name: 'openai-compatible',
            apiKey: args.apiKey,
            baseURL: args.customUrl,
            includeUsage: true,
            headers: args.config?.headers,
            queryParams: args.config?.queryParams,
          })
          return customProvider(args.modelId)
        })
        .with('opencode', () => {
          // OpenCode.ai provider - uses OpenAI-compatible format
          if (!args.apiKey) {
            throw new Error('OpenCode provider requires apiKey')
          }
          // OpenCode uses the same pattern as other OpenAI-compatible providers
          const opencodeProvider = createOpenAICompatible({
            name: 'opencode',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.opencode.ai/v1',
            includeUsage: true,
            headers: {
              ...args.config?.headers,
            },
          })
          // The provider returns a function that takes modelId
          return opencodeProvider(args.modelId)
        })
        .with('mistral', () => {
          // Mistral AI - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Mistral provider requires apiKey')
          }
          const mistralProvider = createOpenAICompatible({
            name: 'mistral',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.mistral.ai/v1',
            includeUsage: true,
          })
          return mistralProvider(args.modelId)
        })
        .with('cohere', () => {
          // Cohere - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Cohere provider requires apiKey')
          }
          const cohereProvider = createOpenAICompatible({
            name: 'cohere',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.cohere.ai/v1',
            includeUsage: true,
          })
          return cohereProvider(args.modelId)
        })
        .with('perplexity', () => {
          // Perplexity - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Perplexity provider requires apiKey')
          }
          const perplexityProvider = createOpenAICompatible({
            name: 'perplexity',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.perplexity.ai',
            includeUsage: true,
          })
          return perplexityProvider(args.modelId)
        })
        .with('fireworks', () => {
          // Fireworks AI - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Fireworks provider requires apiKey')
          }
          const fireworksProvider = createOpenAICompatible({
            name: 'fireworks',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.fireworks.ai/inference/v1',
            includeUsage: true,
          })
          return fireworksProvider(args.modelId)
        })
        .with('together', () => {
          // Together AI - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Together provider requires apiKey')
          }
          const togetherProvider = createOpenAICompatible({
            name: 'together',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.together.xyz/v1',
            includeUsage: true,
          })
          return togetherProvider(args.modelId)
        })
        .with('moonshot', () => {
          // Moonshot AI - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Moonshot provider requires apiKey')
          }
          const moonshotProvider = createOpenAICompatible({
            name: 'moonshot',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.moonshot.cn/v1',
            includeUsage: true,
          })
          return moonshotProvider(args.modelId)
        })
        .with('qwen', () => {
          // Qwen (Alibaba) - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('Qwen provider requires apiKey')
          }
          const qwenProvider = createOpenAICompatible({
            name: 'qwen',
            apiKey: args.apiKey,
            baseURL:
              args.customUrl ||
              'https://dashscope.aliyuncs.com/compatible-mode/v1',
            includeUsage: true,
          })
          return qwenProvider(args.modelId)
        })
        .with('stepfun', () => {
          // StepFun - OpenAI-compatible
          if (!args.apiKey) {
            throw new Error('StepFun provider requires apiKey')
          }
          const stepfunProvider = createOpenAICompatible({
            name: 'stepfun',
            apiKey: args.apiKey,
            baseURL: args.customUrl || 'https://api.stepfun.com/v1',
            includeUsage: true,
          })
          return stepfunProvider(args.modelId)
        })
        .with('replicate', () => {
          throw new Error(
            'Replicate provider not yet implemented - requires different SDK',
          )
        })
        .exhaustive()

      // Create the agent
      const agent = createAuthorAgent(provider)

      // Stream the response
      await agent.streamText(
        ctx,
        { threadId: args.threadId },
        // @ts-ignore types are strict
        { prompt: args.prompt },
        { saveStreamDeltas: true },
      )

      await ctx.scheduler.runAfter(
        0,
        internal.functions.memoryExtraction.extractMemoriesFromThread,
        {
          threadId: args.threadId,
        },
      )
    } catch (error) {
      // Log the error for debugging
      console.error('Error in streamMessage:', error)

      // Get detailed error information
      let errorMessage = 'Unknown error occurred'
      let errorDetails = ''

      if (error instanceof Error) {
        errorMessage = error.message
        errorDetails = error.stack || ''
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object') {
        // Handle ConvexError or other error objects
        const errorObj = error as any
        errorMessage =
          errorObj.message || errorObj.error || JSON.stringify(error)
        errorDetails = errorObj.stack || errorObj.details || ''
      }

      // Create a user-friendly error message
      const userMessage = `🚨 **Error**: I encountered an issue while processing your request.\n\n**Details:** ${errorMessage}\n\nPlease try again or contact support if this persists.`

      // Store the error message in the thread
      try {
        await ctx.runMutation(internal.agents.storeErrorMessage, {
          threadId: args.threadId,
          errorMessage: userMessage,
          errorDetails: errorDetails || errorMessage,
        })
      } catch (storeError) {
        console.error('Failed to store error message:', storeError)
      }

      // Return the error instead of throwing to prevent Convex from crashing
      // The error has already been stored and will be shown to the user
      return { success: false, error: errorMessage }
    }
  },
})

// Internal mutation to store error messages
export const storeErrorMessage = internalMutation({
  args: {
    threadId: v.string(),
    errorMessage: v.string(),
    errorDetails: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    // Store error in thread metadata for UI display
    const userId = await getAuthUserId(ctx)
    if (!userId) return

    await ctx.db.insert('messages', {
      body: args.errorMessage,
      userId: userId as Id<'users'>,
      role: 'assistant',
    })
  },
})

// Generate a concise title for the thread based on the first message
export const generateThreadTitle = internalAction({
  args: {
    threadId: v.string(),
    firstMessage: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Use a lightweight model for title generation
      // Using OpenRouter with a small, fast model
      const titleModel = openrouter.chat('openai/gpt-4o-mini')

      // Create a simple agent for title generation with system instructions
      const agent = new Agent(components.agent, {
        name: 'TitleGenerator',
        languageModel: titleModel,
        maxSteps: 1,
        instructions:
          "You are a helpful assistant that creates concise, descriptive titles for conversations. Create a title that is 3-5 words maximum, capturing the essence of the user's message. Be specific but brief. Return ONLY the title, nothing else.",
      })

      // Generate title using the AI
      // @ts-ignore types are strict
      const response = await agent.generateText(ctx, {
        threadId: args.threadId,
        messages: [
          {
            role: 'user',
            content: `Create a short, descriptive title (3-5 words max) for a conversation that starts with this message:\n\n"${args.firstMessage}"\n\nReturn ONLY the title, nothing else.`,
          },
        ],
      })

      // Clean up the title (remove quotes, extra whitespace)
      let title = response.text.trim()
      title = title.replace(/^["']|["']$/g, '') // Remove surrounding quotes
      title = title.substring(0, 50) // Limit to 50 characters

      if (title.length > 0) {
        // Update the thread title
        await ctx.runMutation(components.agent.threads.updateThread, {
          threadId: args.threadId,
          patch: { title },
        })
      }
    } catch (error) {
      console.error('Error generating thread title:', error)
      // Silently fail - the thread will just keep its default name
    }
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
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to generate messages',
      })
    }

    const model = await ctx.db.get(args.modelId)
    if (!model) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Model not found',
      })
    }

    const provider = await ctx.db.get(model.providerId)
    if (!provider) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Provider not found',
      })
    }

    // Use the agent to stream the response
    await ctx.scheduler.runAfter(0, internal.agents.streamMessage, {
      agent: provider.providerType,
      modelId: model.modelId,
      prompt: args.prompt,
      threadId: args.threadId,
      apiKey: provider.apiKey,
      customUrl: provider.baseURL,
      config: provider.config,
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
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create a chat thread',
      })
    }
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
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update a thread',
      })
    }

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata || metadata.userId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Thread not found or you do not have permission to update it',
      })
    }

    await ctx.db.patch('threadMetadata', metadata._id, {
      sectionId: args.sectionId,
    })
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
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to pin a thread',
      })
    }

    // Find the metadata for this thread
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Thread metadata not found',
      })
    }

    if (metadata.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You are not authorized to pin this thread',
      })
    }

    // Toggle between 0 (not pinned) and 1 (pinned)
    const newSortOrder = metadata.sortOrder === 1 ? 0 : 1

    await ctx.db.patch('threadMetadata', metadata._id, {
      sortOrder: newSortOrder,
    })

    return newSortOrder
  },
})

// Update thread icon
export const updateThreadIcon = mutation({
  args: {
    threadId: v.string(),
    icon: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update thread icon',
      })
    }

    // Find the metadata for this thread
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Thread metadata not found',
      })
    }

    if (metadata.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You are not authorized to update this thread',
      })
    }

    // Update the icon
    await ctx.db.patch('threadMetadata', metadata._id, {
      icon: args.icon,
    })

    return args.icon
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
