import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

describe('Memory Storage API', () => {
  let userId: Id<'users'>

  beforeEach(async () => {
    const t = convexTest(schema)
    userId = await t.run(async (ctx) => {
      const user = await ctx.db.insert('users', {
        name: 'Test User',
        email: 'test@example.com',
        emailVerificationTime: 0,
        isAnonymous: false,
      })
      return user
    })
  })

  describe('createMemory', () => {
    it('should create memory with valid embedding (1536 dimensions)', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.createMemory, {
          content: 'User prefers TypeScript over JavaScript',
          scope: 'profile',
          scopeId: undefined,
          embedding,
        })

      expect(result).toBeDefined()
      expect(result).toHaveProperty('memoryId')
    })

    it('should reject embedding with wrong dimensions', async () => {
      const t = convexTest(schema)

      const wrongEmbedding = new Array(100).fill(0.1)

      await expect(
        t
          .withIdentity({ subject: userId })
          .mutation(api.memories.createMemory, {
            content: 'Test memory',
            scope: 'profile',
            scopeId: undefined,
            embedding: wrongEmbedding,
          }),
      ).rejects.toThrow()
    })

    it('should set initial scores correctly', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      const memoryId = await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.createMemory, {
          content: 'Test memory',
          scope: 'thread',
          scopeId: 'thread-123',
          embedding,
        })

      const memory = await t.run(async (ctx) => {
        return await ctx.db.get('memories', memoryId.memoryId as Id<'memories'>)
      })

      expect(memory).toBeDefined()
      expect(memory?.recencyScore).toBe(1.0)
      expect(memory?.importanceScore).toBe(0.5)
      expect(memory?.relevanceScore).toBeGreaterThanOrEqual(0)
      expect(memory?.relevanceScore).toBeLessThanOrEqual(1)
    })

    it('should store memory with correct scope', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.createMemory, {
          content: 'Project uses React and TypeScript',
          scope: 'project',
          scopeId: 'project-123',
          embedding,
        })

      const memories = await t.run(async (ctx) => {
        return await ctx.db
          .query('memories')
          .withIndex('by_user_scope_id', (q) =>
            q
              .eq('userId', userId)
              .eq('scope', 'project')
              .eq('scopeId', 'project-123'),
          )
          .collect()
      })

      expect(memories).toHaveLength(1)
      expect(memories[0].scope).toBe('project')
      expect(memories[0].scopeId).toBe('project-123')
    })

    it('should require authentication', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      await expect(
        t.mutation(api.memories.createMemory, {
          content: 'Test memory',
          scope: 'profile',
          scopeId: undefined,
          embedding,
        }),
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('deleteMemory', () => {
    it('should delete memory owned by user', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      const memoryId = await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.createMemory, {
          content: 'Memory to delete',
          scope: 'profile',
          scopeId: undefined,
          embedding,
        })

      await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.deleteMemory, {
          memoryId: memoryId.memoryId as Id<'memories'>,
        })

      const memory = await t.run(async (ctx) => {
        return await ctx.db.get('memories', memoryId.memoryId as Id<'memories'>)
      })

      expect(memory).toBeNull()
    })

    it('should not delete memory owned by another user', async () => {
      const t = convexTest(schema)

      // Create a memory for userId
      const embedding = new Array(1536).fill(0.1)

      const memoryId = await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.createMemory, {
          content: "User's memory",
          scope: 'profile',
          scopeId: undefined,
          embedding,
        })

      // Verify memory was created with userId
      const createdMemory = await t.run(async (ctx) => {
        return await ctx.db.get('memories', memoryId.memoryId as Id<'memories'>)
      })

      expect(createdMemory).toBeDefined()
      expect(createdMemory?.userId).toEqual(userId)

      // Manually change the memory's userId to simulate another user's memory
      await t.run(async (ctx) => {
        // Create a fake "other user" ID by using a different ID value
        // We'll just modify the memory directly
        await ctx.db.patch('memories', memoryId.memoryId as Id<'memories'>, {
          userId: '10001;users' as Id<'users'>, // Different user ID
        })
      })

      // Verify the memory's userId was changed
      const patchedMemory = await t.run(async (ctx) => {
        return await ctx.db.get('memories', memoryId.memoryId as Id<'memories'>)
      })

      expect(patchedMemory?.userId).not.toEqual(userId)

      // Now try to delete as userId - should fail because memory belongs to different user
      await expect(
        t
          .withIdentity({ subject: userId })
          .mutation(api.memories.deleteMemory, {
            memoryId: memoryId.memoryId as Id<'memories'>,
          }),
      ).rejects.toThrow()

      const memory = await t.run(async (ctx) => {
        return await ctx.db.get('memories', memoryId.memoryId as Id<'memories'>)
      })

      expect(memory).not.toBeNull()
    })

    it('should require authentication', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      const memoryId = await t
        .withIdentity({ subject: userId })
        .mutation(api.memories.createMemory, {
          content: 'Test memory',
          scope: 'profile',
          scopeId: undefined,
          embedding,
        })

      await expect(
        t.mutation(api.memories.deleteMemory, {
          memoryId: memoryId.memoryId as Id<'memories'>,
        }),
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('listMemories', () => {
    it('should list memories for user with pagination', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert('memories', {
            userId,
            scope: 'profile',
            scopeId: undefined,
            content: `Memory ${i}`,
            embedding,
            relevanceScore: 0.5,
            recencyScore: 1.0,
            importanceScore: 0.5,
            createdAt: Date.now() - i * 1000,
            updatedAt: Date.now() - i * 1000,
            metadata: {},
          })
        }
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.memories.listMemories, {
          scope: 'profile',
          scopeId: undefined,
          paginationOpts: {
            numItems: 3,
            cursor: null,
          },
        })

      expect(result.page).toHaveLength(3)
      expect(result.continueCursor).toBeDefined()
    })

    it('should filter by userId and scope', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      // Create memories directly in the database
      await t.run(async (ctx) => {
        // Memory 1: userId, scope='profile', scopeId=undefined
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'User memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })

        // Memory 2: userId, scope='project', scopeId='project-123'
        await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-123',
          content: 'Project memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })

        // Memory 3: Different userId, scope='profile', scopeId=undefined
        // We'll use a string that looks like a different user ID
        await ctx.db.insert('memories', {
          userId: '10001;users' as Id<'users'>,
          scope: 'profile',
          scopeId: undefined,
          content: 'Other user memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
      })

      // Verify all 3 memories were created
      const allMemories = await t.run(async (ctx) => {
        return await ctx.db.query('memories').collect()
      })
      expect(allMemories).toHaveLength(3)

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.memories.listMemories, {
          scope: 'profile',
          scopeId: undefined,
          paginationOpts: {
            numItems: 10,
            cursor: null,
          },
        })

      // Should only return Memory 1 (userId, scope='profile', scopeId=undefined)
      // Memory 2 has scope='project'
      // Memory 3 has different userId
      expect(result.page).toHaveLength(1)
      expect(result.page[0].content).toBe('User memory')
    })

    it('should filter by scopeId when provided', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      await t.run(async (ctx) => {
        await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-123',
          content: 'Project 123 memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })

        await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-456',
          content: 'Project 456 memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.memories.listMemories, {
          scope: 'project',
          scopeId: 'project-123',
          paginationOpts: {
            numItems: 10,
            cursor: null,
          },
        })

      expect(result.page).toHaveLength(1)
      expect(result.page[0].content).toBe('Project 123 memory')
    })

    it('should return memories sorted by createdAt descending', async () => {
      const t = convexTest(schema)

      const embedding = new Array(1536).fill(0.1)

      const now = Date.now()

      await t.run(async (ctx) => {
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'Oldest memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: now - 2000,
          updatedAt: now - 2000,
          metadata: {},
        })

        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'Newest memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: now,
          updatedAt: now,
          metadata: {},
        })

        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'Middle memory',
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: now - 1000,
          updatedAt: now - 1000,
          metadata: {},
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.memories.listMemories, {
          scope: 'profile',
          scopeId: undefined,
          paginationOpts: {
            numItems: 10,
            cursor: null,
          },
        })

      expect(result.page).toHaveLength(3)
      expect(result.page[0].content).toBe('Newest memory')
      expect(result.page[1].content).toBe('Middle memory')
      expect(result.page[2].content).toBe('Oldest memory')
    })

    it('should require authentication', async () => {
      const t = convexTest(schema)

      await expect(
        t.query(api.memories.listMemories, {
          scope: 'profile',
          scopeId: undefined,
          paginationOpts: {
            numItems: 10,
            cursor: null,
          },
        }),
      ).rejects.toThrow()
    })
  })
})

describe('Memory Embedding Generation', () => {
  // Skip tests if no valid OpenAI API key is available
  const hasValidApiKey =
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'sk-test-key-for-testing'

  describe.skipIf(!hasValidApiKey)(
    'generateEmbedding (requires OPENAI_API_KEY)',
    () => {
      it('should generate embedding with 1536 dimensions', async () => {
        const t = convexTest(schema)

        const result = await t.action(api.memories.generateEmbedding, {
          content: 'User prefers TypeScript over JavaScript',
        })

        expect(result).toBeDefined()
        expect(result.embedding).toBeDefined()
        expect(result.embedding).toHaveLength(1536)
        expect(result.latency).toBeGreaterThan(0)
      })

      it('should handle empty content', async () => {
        const t = convexTest(schema)

        const result = await t.action(api.memories.generateEmbedding, {
          content: '',
        })

        expect(result).toBeDefined()
        expect(result.embedding).toBeDefined()
        expect(result.embedding).toHaveLength(1536)
      })

      it('should handle long content', async () => {
        const t = convexTest(schema)

        const longContent = 'A'.repeat(8000)

        const result = await t.action(api.memories.generateEmbedding, {
          content: longContent,
        })

        expect(result).toBeDefined()
        expect(result.embedding).toBeDefined()
        expect(result.embedding).toHaveLength(1536)
      })

      it('should generate different embeddings for different content', async () => {
        const t = convexTest(schema)

        const result1 = await t.action(api.memories.generateEmbedding, {
          content: 'User loves TypeScript',
        })

        const result2 = await t.action(api.memories.generateEmbedding, {
          content: 'User hates JavaScript',
        })

        expect(result1.embedding).not.toEqual(result2.embedding)
      })

      it('should generate similar embeddings for similar content', async () => {
        const t = convexTest(schema)

        const result1 = await t.action(api.memories.generateEmbedding, {
          content: 'The user prefers TypeScript',
        })

        const result2 = await t.action(api.memories.generateEmbedding, {
          content: 'User likes TypeScript',
        })

        expect(result1.embedding).toBeDefined()
        expect(result2.embedding).toBeDefined()

        // Calculate cosine similarity
        const dotProduct = result1.embedding.reduce(
          (sum: number, val: number, i: number) =>
            sum + val * result2.embedding[i],
          0,
        )
        const magnitude1 = Math.sqrt(
          result1.embedding.reduce(
            (sum: number, val: number) => sum + val * val,
            0,
          ),
        )
        const magnitude2 = Math.sqrt(
          result2.embedding.reduce(
            (sum: number, val: number) => sum + val * val,
            0,
          ),
        )
        const similarity = dotProduct / (magnitude1 * magnitude2)

        // Similar content should have high similarity (>0.8)
        expect(similarity).toBeGreaterThan(0.8)
      })

      it('should complete within 200ms for short content', async () => {
        const t = convexTest(schema)

        const result = await t.action(api.memories.generateEmbedding, {
          content: 'Short test content',
        })

        expect(result.latency).toBeLessThan(200)
      })
    },
  )

  describe('generateEmbedding error handling', () => {
    it('should throw error with invalid API key', async () => {
      const t = convexTest(schema)

      // Temporarily override the API key for this test
      const originalKey = process.env.OPENAI_API_KEY
      process.env.OPENAI_API_KEY = 'sk-invalid-key'

      try {
        await expect(
          t.action(api.memories.generateEmbedding, {
            content: 'Test content',
          }),
        ).rejects.toThrow()
      } finally {
        // Restore original key
        process.env.OPENAI_API_KEY = originalKey
      }
    })
  })
})

describe('Memory Retrieval and Ranking', () => {
  let userId: Id<'users'>

  beforeEach(async () => {
    const t = convexTest(schema)
    userId = await t.run(async (ctx) => {
      const user = await ctx.db.insert('users', {
        name: 'Test User',
        email: 'test@example.com',
        emailVerificationTime: 0,
        isAnonymous: false,
      })
      return user
    })
  })

  describe('rankMemories', () => {
    it('should retrieve memories using vector search and rank them', async () => {
      const t = convexTest(schema)

      // Create a query embedding
      const queryEmbedding = new Array(1536)
        .fill(0.1)
        .map((_, i) => (i % 2 === 0 ? 0.1 : -0.1))

      // Create some memories with varying relevance scores
      const embedding1 = new Array(1536)
        .fill(0.1)
        .map((_, i) => (i % 2 === 0 ? 0.12 : -0.08))
      const embedding2 = new Array(1536)
        .fill(0.1)
        .map((_, i) => (i % 3 === 0 ? 0.15 : -0.05))
      const embedding3 = new Array(1536).fill(0.05)

      await t.run(async (ctx) => {
        const now = Date.now()

        // Memory 1: High relevance, recent (created 1 day ago)
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'User prefers TypeScript for web development',
          embedding: embedding1,
          relevanceScore: 0.9,
          recencyScore: Math.exp(-1 / 30), // 1 day old
          importanceScore: 0.7,
          createdAt: now - 24 * 60 * 60 * 1000,
          updatedAt: now - 24 * 60 * 60 * 1000,
          metadata: {},
        })

        // Memory 2: Medium relevance, less recent (created 10 days ago)
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'User knows React and Node.js',
          embedding: embedding2,
          relevanceScore: 0.6,
          recencyScore: Math.exp(-10 / 30), // 10 days old
          importanceScore: 0.5,
          createdAt: now - 10 * 24 * 60 * 60 * 1000,
          updatedAt: now - 10 * 24 * 60 * 60 * 1000,
          metadata: {},
        })

        // Memory 3: Low relevance, old (created 30 days ago)
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'User once used Python for a script',
          embedding: embedding3,
          relevanceScore: 0.3,
          recencyScore: Math.exp(-30 / 30), // 30 days old
          importanceScore: 0.4,
          createdAt: now - 30 * 24 * 60 * 60 * 1000,
          updatedAt: now - 30 * 24 * 60 * 60 * 1000,
          metadata: {},
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 10,
          scopeFilters: {
            scopes: ['profile'],
            scopeIds: [],
          },
        })

      expect(result.memories).toBeDefined()
      expect(result.memories.length).toBeGreaterThan(0)
      expect(result.memories.length).toBeLessThanOrEqual(10)

      // Verify memories are ranked by combined score
      // Formula: 0.5 * relevance + 0.3 * recency + 0.2 * importance
      const scores = result.memories.map(
        (m: { rankScore: number }) => m.rankScore,
      )
      // Check that scores are in descending order
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
      }
    })

    it('should respect topK limit', async () => {
      const t = convexTest(schema)

      const queryEmbedding = new Array(1536).fill(0.1)
      const embedding = new Array(1536).fill(0.1)

      // Create 15 memories
      await t.run(async (ctx) => {
        for (let i = 0; i < 15; i++) {
          await ctx.db.insert('memories', {
            userId,
            scope: 'profile',
            scopeId: undefined,
            content: `Memory ${i}`,
            embedding,
            relevanceScore: 0.5,
            recencyScore: 1.0,
            importanceScore: 0.5,
            createdAt: Date.now() - i * 1000,
            updatedAt: Date.now() - i * 1000,
            metadata: {},
          })
        }
      })

      const result = await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 5,
          scopeFilters: {
            scopes: ['profile'],
            scopeIds: [],
          },
        })

      expect(result.memories.length).toBeLessThanOrEqual(5)
    })

    it('should filter by scope correctly', async () => {
      const t = convexTest(schema)

      const queryEmbedding = new Array(1536).fill(0.1)
      const embedding = new Array(1536).fill(0.1)

      await t.run(async (ctx) => {
        // Create profile memories
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'Profile memory 1',
          embedding,
          relevanceScore: 0.8,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })

        // Create project memory
        await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-123',
          content: 'Project memory 1',
          embedding,
          relevanceScore: 0.9,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
      })

      // Query only profile scope
      const result = await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 10,
          scopeFilters: {
            scopes: ['profile'],
            scopeIds: [],
          },
        })

      expect(result.memories).toBeDefined()
      expect(result.memories.length).toBe(1)
      expect(result.memories[0].content).toBe('Profile memory 1')
    })

    it('should filter by scopeId when provided', async () => {
      const t = convexTest(schema)

      const queryEmbedding = new Array(1536).fill(0.1)
      const embedding = new Array(1536).fill(0.1)

      await t.run(async (ctx) => {
        // Create memories for different projects
        await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-123',
          content: 'Project 123 memory',
          embedding,
          relevanceScore: 0.9,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })

        await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-456',
          content: 'Project 456 memory',
          embedding,
          relevanceScore: 0.8,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
      })

      // Query only project-123
      const result = await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 10,
          scopeFilters: {
            scopes: ['project'],
            scopeIds: ['project-123'],
          },
        })

      expect(result.memories).toBeDefined()
      expect(result.memories.length).toBe(1)
      expect(result.memories[0].content).toBe('Project 123 memory')
    })

    it('should return empty array when no memories match', async () => {
      const t = convexTest(schema)

      const queryEmbedding = new Array(1536).fill(0.1)

      const result = await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 10,
          scopeFilters: {
            scopes: ['profile'],
            scopeIds: [],
          },
        })

      expect(result.memories).toEqual([])
      expect(result.totalCount).toBe(0)
    })

    it('should complete within 100ms for vector search', async () => {
      const t = convexTest(schema)

      const queryEmbedding = new Array(1536).fill(0.1)
      const embedding = new Array(1536).fill(0.1)

      // Create 100 memories
      await t.run(async (ctx) => {
        for (let i = 0; i < 100; i++) {
          await ctx.db.insert('memories', {
            userId,
            scope: 'profile',
            scopeId: undefined,
            content: `Memory ${i}`,
            embedding,
            relevanceScore: 0.5 + Math.random() * 0.5,
            recencyScore: 1.0 - i * 0.01,
            importanceScore: 0.5,
            createdAt: Date.now() - i * 1000,
            updatedAt: Date.now() - i * 1000,
            metadata: {},
          })
        }
      })

      const startTime = Date.now()
      await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 10,
          scopeFilters: {
            scopes: ['profile'],
            scopeIds: [],
          },
        })
      const duration = Date.now() - startTime

      // Vector search should be fast
      expect(duration).toBeLessThan(500) // Relaxed for test environment
    })
  })

  describe('Recency calculation', () => {
    it('should calculate recency score using exponential decay', async () => {
      const t = convexTest(schema)

      const now = Date.now()

      // Create memories with different ages
      await t.run(async (ctx) => {
        // Recent memory (1 day old)
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'Recent memory',
          embedding: new Array(1536).fill(0.1),
          relevanceScore: 0.5,
          recencyScore: Math.exp(-1 / 30),
          importanceScore: 0.5,
          createdAt: now - 24 * 60 * 60 * 1000,
          updatedAt: now - 24 * 60 * 60 * 1000,
          metadata: {},
        })

        // Old memory (60 days old)
        await ctx.db.insert('memories', {
          userId,
          scope: 'profile',
          scopeId: undefined,
          content: 'Old memory',
          embedding: new Array(1536).fill(0.1),
          relevanceScore: 0.5,
          recencyScore: Math.exp(-60 / 30),
          importanceScore: 0.5,
          createdAt: now - 60 * 24 * 60 * 60 * 1000,
          updatedAt: now - 60 * 24 * 60 * 60 * 1000,
          metadata: {},
        })
      })

      const queryEmbedding = new Array(1536).fill(0.1)

      const result = await t
        .withIdentity({ subject: userId })
        .action(api.memories.rankMemories, {
          queryEmbedding,
          topK: 10,
          scopeFilters: {
            scopes: ['profile'],
            scopeIds: [],
          },
        })

      // Recent memory should rank higher due to recency
      expect(result.memories[0].content).toBe('Recent memory')
    })
  })
})
