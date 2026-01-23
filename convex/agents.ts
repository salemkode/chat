import { components, api } from './_generated/api'
import { Agent } from '@convex-dev/agent'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { action, mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { createThread } from '@convex-dev/agent'
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
