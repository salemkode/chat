import { mutation, query, action } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { createOpenAI } from '@ai-sdk/openai'
import { embed } from 'ai'
import { api } from './_generated/api'

// Expected embedding dimensions for text-embedding-3-small
const EMBEDDING_DIMENSIONS = 1536

// Create OpenAI client for embeddings
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  compatibility: 'strict', // Use strict mode for best compatibility
})

export const createMemory = mutation({
  args: {
    content: v.string(),
    scope: v.union(
      v.literal('profile'),
      v.literal('skill'),
      v.literal('project'),
      v.literal('thread'),
      v.literal('pinned'),
    ),
    scopeId: v.optional(v.string()),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Validate embedding dimensions
    if (args.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimensions. Expected ${EMBEDDING_DIMENSIONS}, got ${args.embedding.length}`,
      )
    }

    const now = Date.now()

    // Calculate initial relevance score from embedding magnitude
    // For now, we'll use a simple calculation: normalized magnitude
    const embeddingMagnitude = Math.sqrt(
      args.embedding.reduce((sum, val) => sum + val * val, 0),
    )
    const relevanceScore = Math.min(
      1,
      embeddingMagnitude / Math.sqrt(EMBEDDING_DIMENSIONS),
    )

    const memoryId = await ctx.db.insert('memories', {
      userId,
      scope: args.scope,
      scopeId: args.scopeId,
      content: args.content,
      embedding: args.embedding,
      relevanceScore,
      recencyScore: 1.0, // Initial recency score (most recent)
      importanceScore: 0.5, // Default importance score
      createdAt: now,
      updatedAt: now,
      metadata: {},
    })

    return {
      memoryId,
    }
  },
})

export const deleteMemory = mutation({
  args: {
    memoryId: v.id('memories'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const memory = await ctx.db.get('memories', args.memoryId)

    if (!memory) {
      throw new Error('Memory not found')
    }

    // Check ownership first
    if (memory.userId !== userId) {
      throw new Error('Unauthorized: You do not own this memory')
    }

    await ctx.db.delete('memories', args.memoryId)

    return {
      success: true,
    }
  },
})

export const listMemories = query({
  args: {
    scope: v.union(
      v.literal('profile'),
      v.literal('skill'),
      v.literal('project'),
      v.literal('thread'),
      v.literal('pinned'),
    ),
    scopeId: v.optional(v.string()),
    paginationOpts: v.object({
      numItems: v.number(),
      cursor: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Query memories by scope and scopeId
    let memories

    if (args.scopeId) {
      // Use the full index with scopeId
      memories = await ctx.db
        .query('memories')
        .withIndex('by_user_scope_id', (q) =>
          q
            .eq('userId', userId)
            .eq('scope', args.scope)
            .eq('scopeId', args.scopeId),
        )
        .collect()
    } else {
      // Use index without scopeId (will return memories with any scopeId)
      // Then filter to only include memories where scopeId is undefined/null
      const allMemories = await ctx.db
        .query('memories')
        .withIndex('by_user_scope_id', (q) =>
          q.eq('userId', userId).eq('scope', args.scope),
        )
        .collect()

      // Filter to only include memories where scopeId is undefined or null
      memories = allMemories.filter((m) => !m.scopeId)
    }

    // Sort by createdAt descending
    memories.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    const numItems = args.paginationOpts.numItems
    const startIdx = args.paginationOpts.cursor
      ? memories.findIndex((m) => m._id === args.paginationOpts.cursor)
      : 0

    const paginatedMemories = memories.slice(startIdx, startIdx + numItems)

    // Get continue cursor
    const continueCursor =
      startIdx + numItems < memories.length
        ? (memories[startIdx + numItems]._id as string)
        : null

    return {
      page: paginatedMemories,
      continueCursor,
    }
  },
})

export const listByUserAndScopeAndScopeId = query({
  args: {
    userId: v.id('users'),
    scope: v.string(),
    scopeId: v.string(),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_user_scope_id', (q) =>
        q
          .eq('userId', args.userId)
          // @ts-expect-error - scope validation happens at runtime
          .eq('scope', args.scope)
          .eq('scopeId', args.scopeId),
      )
      .collect()

    return memories
  },
})

export const listByUserAndScope = query({
  args: {
    userId: v.id('users'),
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    const memories = await ctx.db
      .query('memories')
      .withIndex('by_user_scope', (q) =>
        q
          .eq('userId', args.userId)
          // @ts-expect-error - scope validation happens at runtime
          .eq('scope', args.scope),
      )
      .collect()

    return memories
  },
})

// Retry configuration for embedding generation
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000 // 1 second

// Helper function to sleep/retry delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate embedding for text content using OpenAI's text-embedding-3-small model.
 *
 * This function:
 * - Calls OpenAI Embeddings API with retry logic
 * - Returns 1536-dimensional embedding vector
 * - Measures latency for performance monitoring
 * - Handles API errors gracefully
 *
 * @param args.content - The text content to embed
 * @returns Object with embedding array and latency in milliseconds
 */
export const generateEmbedding = action({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    // Retry logic for API calls
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { embedding } = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: args.content,
        })

        const latency = Date.now() - startTime

        // Validate embedding dimensions
        if (embedding.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(
            `Invalid embedding dimensions. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
          )
        }

        return {
          embedding,
          latency,
        }
      } catch (error) {
        lastError = error as Error

        // Don't retry on certain errors
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('API key')) {
          throw new Error('Invalid API key - check OPENAI_API_KEY')
        }

        // If this isn't the last attempt, wait and retry
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1)) // Exponential backoff
          continue
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
    )
  },
})

/**
 * Ranking function that combines relevance, recency, and importance scores.
 *
 * Formula: rank = 0.5 * relevance + 0.3 * recency + 0.2 * importance
 *
 * @param relevance - Vector similarity score (0-1)
 * @param recency - Time-based decay score (0-1)
 * @param importance - User-defined importance (0-1)
 * @returns Combined rank score (0-1)
 */
function calculateRank(
  relevance: number,
  recency: number,
  importance: number,
): number {
  const alpha = 0.5 // Relevance weight
  const beta = 0.3 // Recency weight
  const gamma = 0.2 // Importance weight

  return alpha * relevance + beta * recency + gamma * importance
}

/**
 * Calculate recency score using exponential decay.
 *
 * Formula: exp(-ageInDays / 30)
 * - Recent memories (0 days) have score ~1.0
 * - 30-day-old memories have score ~0.37
 * - 60-day-old memories have score ~0.14
 *
 * @param createdAt - Timestamp when memory was created
 * @returns Recency score (0-1)
 */
function calculateRecencyScore(createdAt: number): number {
  const now = Date.now()
  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24)
  return Math.exp(-ageInDays / 30) // Half-life of 30 days
}

/**
 * Retrieve and rank memories using vector similarity search.
 *
 * This function:
 * - Performs vector search using Convex's vector index
 * - Filters by scope and optional scopeId
 * - Ranks results using the ranking formula
 * - Returns top K results
 *
 * @param args.queryEmbedding - The query embedding vector (1536 dimensions)
 * @param args.topK - Maximum number of results to return
 * @param args.scopeFilters.scopes - Array of scopes to search
 * @param args.scopeFilters.scopeIds - Optional array of scopeIds to filter by
 * @returns Object with ranked memories and total count
 */
export const rankMemories = action({
  args: {
    queryEmbedding: v.array(v.float64()),
    topK: v.number(),
    scopeFilters: v.object({
      scopes: v.array(
        v.union(
          v.literal('profile'),
          v.literal('skill'),
          v.literal('project'),
          v.literal('thread'),
          v.literal('pinned'),
        ),
      ),
      scopeIds: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    // Validate query embedding dimensions
    if (args.queryEmbedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid query embedding dimensions. Expected ${EMBEDDING_DIMENSIONS}, got ${args.queryEmbedding.length}`,
      )
    }

    // Collect all candidate memories with their vector scores
    const allMemories: Array<{
      memory: typeof schema.memories.doc
      vectorScore: number
    }> = []

    // For each scope, perform vector search
    for (const scope of args.scopeFilters.scopes) {
      // Determine if we should filter by scopeId
      const shouldFilterByScopeId =
        args.scopeFilters.scopeIds && args.scopeFilters.scopeIds.length > 0

      if (shouldFilterByScopeId) {
        // Search with scopeId filter - iterate through each scopeId
        for (const scopeId of args.scopeFilters.scopeIds!) {
          // Get memories by query first, then do vector search on results
          // This is a workaround since vector search filters are limited
          const candidateMemories = await ctx.runQuery(
            api.memories.listByUserAndScopeAndScopeId,
            {
              userId,
              scope,
              scopeId,
            },
          )

          // Calculate similarity for each candidate memory
          for (const memory of candidateMemories) {
            // Calculate cosine similarity
            let dotProduct = 0
            let mag1 = 0
            let mag2 = 0

            for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
              dotProduct += args.queryEmbedding[i] * memory.embedding[i]
              mag1 += args.queryEmbedding[i] * args.queryEmbedding[i]
              mag2 += memory.embedding[i] * memory.embedding[i]
            }

            const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2))

            allMemories.push({
              memory,
              vectorScore: similarity,
            })
          }
        }
      } else {
        // Get all memories for the user in this scope
        const candidateMemories = await ctx.runQuery(
          api.memories.listByUserAndScope,
          {
            userId,
            scope,
          },
        )

        // Calculate similarity for each candidate memory
        for (const memory of candidateMemories) {
          // Calculate cosine similarity
          let dotProduct = 0
          let mag1 = 0
          let mag2 = 0

          for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
            dotProduct += args.queryEmbedding[i] * memory.embedding[i]
            mag1 += args.queryEmbedding[i] * args.queryEmbedding[i]
            mag2 += memory.embedding[i] * memory.embedding[i]
          }

          const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2))

          allMemories.push({
            memory,
            vectorScore: similarity,
          })
        }
      }
    }

    // Calculate ranking scores for each memory
    const rankedMemories = allMemories.map(({ memory, vectorScore }) => {
      // Use vector similarity as relevance score
      const relevance = vectorScore

      // Calculate recency score
      const recency = calculateRecencyScore(memory.createdAt)

      // Get importance score from memory
      const importance = memory.importanceScore

      // Calculate combined rank
      const rankScore = calculateRank(relevance, recency, importance)

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        ...memory,
        rankScore,
      }
    })

    // Sort by rank score (descending)
    rankedMemories.sort((a, b) => b.rankScore - a.rankScore)

    // Remove duplicates (same memory may appear from multiple searches)
    const uniqueMemories = rankedMemories.filter(
      (memory, index, self) =>
        index === self.findIndex((m) => m._id === memory._id),
    )

    // Return top K results
    const topMemories = uniqueMemories.slice(0, args.topK)

    return {
      memories: topMemories,
      totalCount: uniqueMemories.length,
    } as const
  },
})
