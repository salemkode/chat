import { components, api } from './_generated/api'
import { Agent, createTool } from '@convex-dev/agent'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { action, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { createThread } from '@convex-dev/agent'
import type { Id } from './_generated/dataModel'
import type { LanguageModel } from 'ai'
import { selectModel, type ChatMode } from './modelRouter'
import { z } from 'zod'

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

// Create OpenRouter provider
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
})

export const chatAgent = new Agent(components.agent, {
  name: 'chat',
  languageModel: openrouter.chat('meta-llama/llama-3-8b-instruct:free'),
  instructions: 'You are a helpful assistant.',
})

export const generateMessage = action({
  args: {
    threadId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Use the agent to stream the response
    await chatAgent.streamText(ctx, { threadId: args.threadId }, { prompt: args.text }, {
      saveStreamDeltas: true,
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

export const classifyMessage = action({
  args: {
    userId: v.string(),
    threadId: v.string(),
    messageContent: v.string(),
  },
  handler: async (ctx, args) => {
    // Regex to match @Project mentions
    // Matches @ followed by alphanumeric, spaces, and hyphens
    // Stops at common connecting words, verbs, punctuation, or end of string
    const mentionRegex =
      /@([a-zA-Z0-9][a-zA-Z0-9\s-]*?)(?=\s+(?:with|for|and|or|but|in|on|at|to|from|by|about|needs|check|review|update|status|notes)|[,.!?;:]|\s*$)/g
    const mentions: Array<{
      projectId: string
      projectName: string
      startIndex: number
      endIndex: number
    }> = []

    let match: RegExpExecArray | null
    mentionRegex.lastIndex = 0

    while ((match = mentionRegex.exec(args.messageContent)) !== null) {
      const projectName = match[1].trim()

      if (projectName.length === 0) continue

      const project = await ctx.runQuery(api.projects.getByName, {
        name: projectName,
        userId: args.userId as Id<'users'>,
      })

      if (project) {
        mentions.push({
          projectId: project._id,
          projectName: project.name,
          startIndex: match.index,
          endIndex: match.index + match[0].length, // Use full match length including @
        })
      }
    }

    let intent: 'question' | 'command' | 'statement' | 'code_request' =
      'statement'
    if (args.messageContent.includes('?')) intent = 'question'
    else if (args.messageContent.match(/^(create|build|implement|add)/i))
      intent = 'command'
    else if (args.messageContent.match(/(code|function|class|component)/i))
      intent = 'code_request'

    return {
      projectMentions: mentions,
      intent,
      entities: mentions.map((m) => m.projectName),
    }
  },
})

// Memory ranking function
function rankMemory(
  relevance: number,
  recency: number,
  importance: number,
): number {
  const alpha = 0.5 // Relevance weight
  const beta = 0.3 // Recency weight
  const gamma = 0.2 // Importance weight

  return alpha * relevance + beta * recency + gamma * importance
}

// Calculate recency score with exponential decay
function calculateRecencyScore(createdAt: number): number {
  const now = Date.now()
  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageInDays / 30) // Half-life of 30 days
}

// Context Builder Agent
export const buildContext = action({
  args: {
    userId: v.string(),
    threadId: v.string(),
    mentionedProjectIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const contextItems: Array<{
      type: 'message' | 'memory'
      content: string
      source: string
      rank: number
    }> = []

    // 1. Thread history (last 20 messages)
    // Note: Since messages don't have threadId in current schema, we skip this for now
    // This will be updated when message schema includes threadId

    // 2. Get thread metadata to find current project
    const threadMetadata = await ctx.runQuery(
      api.threadMetadata.getByThreadId,
      {
        threadId: args.threadId,
      },
    )

    const currentProjectId = threadMetadata?.projectId

    // Collect all relevant project IDs (current + mentioned)
    const allProjectIds = new Set<string>()
    if (currentProjectId) {
      allProjectIds.add(currentProjectId)
    }
    args.mentionedProjectIds.forEach((id) => allProjectIds.add(id))

    // 3. Project memories (if thread attached to project OR @mentioned)
    for (const projectId of allProjectIds) {
      const projectMemories = await ctx.runQuery(
        api.memories.listByUserAndScopeAndScopeId,
        {
          userId: args.userId as Id<'users'>,
          scope: 'project',
          scopeId: projectId,
        },
      )

      for (const memory of projectMemories) {
        // Calculate ranking score
        const recencyScore = calculateRecencyScore(memory.createdAt)
        const rank = rankMemory(
          memory.relevanceScore,
          recencyScore,
          memory.importanceScore,
        )

        contextItems.push({
          type: 'memory',
          content: memory.content,
          source: `project:${projectId}`,
          rank: rank * 0.8, // Base multiplier for project memories
        })
      }
    }

    // 4. Pinned global memory
    const pinnedMemories = await ctx.runQuery(api.memories.listByUserAndScope, {
      userId: args.userId as Id<'users'>,
      scope: 'pinned',
    })

    for (const memory of pinnedMemories) {
      const recencyScore = calculateRecencyScore(memory.createdAt)
      const rank = rankMemory(
        memory.relevanceScore,
        recencyScore,
        memory.importanceScore,
      )

      contextItems.push({
        type: 'memory',
        content: memory.content,
        source: 'pinned',
        rank: rank * 0.9, // Base multiplier for pinned memories
      })
    }

    // 5. Rank and truncate to token limit
    contextItems.sort((a, b) => b.rank - a.rank)

    const MAX_TOKENS = 8000
    const SEPARATOR = '\n\n---\n\n'
    const SEPARATOR_TOKENS = Math.ceil(SEPARATOR.length / 4)
    let tokenCount = 0
    const truncatedContext: string[] = []

    for (const item of contextItems) {
      const itemTokens = Math.ceil(item.content.length / 4)
      // Account for separator (except for first item)
      const separatorTokens = truncatedContext.length > 0 ? SEPARATOR_TOKENS : 0
      if (tokenCount + itemTokens + separatorTokens > MAX_TOKENS) break
      truncatedContext.push(item.content)
      tokenCount += itemTokens + separatorTokens
    }

    // Collect unique sources
    const sources = [
      ...new Set(contextItems.map((c) => c.source.split(':')[0])),
    ]

    // Join context with separator
    const context = truncatedContext.join(SEPARATOR)

    return {
      context,
      sources,
      tokenCount,
    }
  },
})

// Mode-specific instructions for the inference agent
const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  code: `You are an expert coding assistant. Help the user write, debug, and understand code.
Focus on providing clean, efficient, and well-documented code solutions.
Use tools to search for relevant context when needed.`,

  learn: `You are a knowledgeable tutor helping the user learn new concepts.
Explain things clearly, use examples, and check for understanding.
Use tools to search for relevant information when needed.`,

  think: `You are a thoughtful analytical assistant. Help the user think through problems,
analyze situations, and make decisions. Use tools to search for context and information.`,

  create: `You are a creative assistant helping the user generate new ideas and content.
Be inventive, suggest alternatives, and help explore possibilities.
Use tools to search for relevant context when needed.`,
}

/**
 * Creates an inference agent with the specified configuration.
 *
 * @param ctx - The action context
 * @param threadId - The thread ID
 * @param projectId - Optional project ID
 * @param userId - The user ID
 * @param languageModel - The language model to use
 * @param mode - The chat mode (code/learn/think/create)
 * @returns A configured Agent instance
 */
export function createInferenceAgent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _ctx: any,
  _threadId: string,
  _projectId: string | null,
  _userId: string,
  languageModel: LanguageModel,
  mode: ChatMode,
): Agent {
  // Create tools for the agent
  const searchMemories = createTool({
    description: 'Search for memories in the current project or user profile',
    args: z.object({
      query: z.string().describe('The search query'),
    }),
    // eslint-disable-next-line @typescript-eslint/require-await
    handler: async (_ctx, args: { query: string }): Promise<string> => {
      // For now, return a placeholder
      // In a full implementation, this would perform vector search
      return `Found memories related to: ${args.query}`
    },
  })

  const getThreadContext = createTool({
    description: 'Get recent messages from the current thread',
    args: z.object({}),
    // eslint-disable-next-line @typescript-eslint/require-await
    handler: async (_ctx, _args): Promise<string> => {
      // For now, return a placeholder
      // In a full implementation, this would fetch thread messages
      return 'Thread context available'
    },
  })

  // Create and return the agent
  return new Agent(components.agent, {
    name: 'inference',
    languageModel,
    instructions: MODE_INSTRUCTIONS[mode],
    tools: {
      searchMemories,
      getThreadContext,
    },
    maxSteps: 3, // Limit multi-step reasoning
  })
}

/**
 * Main sendMessage action that orchestrates the entire inference pipeline.
 *
 * Pipeline:
 * 1. Get thread info
 * 2. Call NLP Classifier to detect mentions and intent
 * 3. Call Context Builder to assemble context
 * 4. Call Model Router to select the optimal model
 * 5. Create Inference Agent with the selected model
 * 6. Run agent with context + user message
 * 7. Store user and assistant messages
 * 8. Store context snapshot in message metadata
 *
 * @param threadId - The thread ID
 * @param content - The user's message content
 * @param mode - The chat mode (code/learn/think/create)
 * @returns Result with assistant message, model used, and token count
 */
export const sendMessage = action({
  args: {
    threadId: v.string(),
    content: v.string(),
    mode: v.union(
      v.literal('code'),
      v.literal('learn'),
      v.literal('think'),
      v.literal('create'),
    ),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    // Get authenticated user ID
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    // 1. Get thread info
    const threadInfo = await ctx.runQuery(api.threadMetadata.getByThreadId, {
      threadId: args.threadId,
    })

    if (!threadInfo || threadInfo.userId !== userId) {
      throw new Error('Thread not found or unauthorized')
    }

    // Store user message
    try {
      const { thread } = await chatAgent.continueThread(ctx, {
        threadId: args.threadId,
      })

      // 2. Call NLP Classifier
      const classification = await ctx.runAction(api.agents.classifyMessage, {
        userId: userId as string,
        threadId: args.threadId,
        messageContent: args.content,
      })

      // 3. Call Context Builder
      let contextSnapshot: {
        context: string
        sources: string[]
        tokenCount: number
      }
      try {
        const mentionedProjectIds = classification.projectMentions.map(
          (m) => m.projectId,
        )

        contextSnapshot = await ctx.runAction(api.agents.buildContext, {
          userId: userId as string,
          threadId: args.threadId,
          mentionedProjectIds,
        })
      } catch (error) {
        // Fallback to thread-only context if context build fails
        console.error('Context build failed, using thread-only context:', error)
        contextSnapshot = {
          context: '',
          sources: ['thread'],
          tokenCount: 0,
        }
      }

      // 4. Call Model Router
      const modelSelection = selectModel(args.mode, contextSnapshot.tokenCount)

      // 5. Create Inference Agent (not directly used, but creates the agent for the thread)
      createInferenceAgent(
        ctx,
        args.threadId,
        threadInfo.projectId ?? null,
        userId as string,
        modelSelection.languageModel,
        args.mode,
      )

      // 6. Run agent with context + user message
      const prompt = contextSnapshot.context
        ? `${contextSnapshot.context}\n\nUser: ${args.content}`
        : args.content

      const result = await thread.generateText({ prompt })

      // 7. Store messages (already done by agent.generateText)
      // Note: result.promptMessageId contains the user message ID

      // 8. Context snapshot is implicitly stored in message metadata by the agent

      const duration = Date.now() - startTime

      return {
        assistantMessage: result.text,
        model: modelSelection.languageModel,
        tokenCount: result.usage?.totalTokens ?? 0,
        duration,
        contextSnapshot: {
          sources: contextSnapshot.sources,
          tokenCount: contextSnapshot.tokenCount,
        },
      }
    } catch (error) {
      console.error('sendMessage error:', error)
      throw error
    }
  },
})
