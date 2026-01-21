import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

describe('Migration: Thread Metadata Backfill', () => {
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

  it('should backfill messageCount for existing threadMetadata', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      await ctx.db.insert('threadMetadata', {
        threadId: 'thread-backfill-1',
        emoji: '💬',
        userId,
        title: 'Test Thread',
        mode: 'think',
        createdAt: Date.now() - 60000,
        lastActiveAt: Date.now() - 60000,
        metadata: {
          messageCount: 0,
          isPinned: false,
        },
      })

      for (let i = 0; i < 10; i++) {
        await ctx.db.insert('messages', {
          body: `Message ${i}`,
          userId,
          role: i % 2 === 0 ? 'user' : 'assistant',
        })
      }
    })

    const result = await t.mutation(api.migrations.backfillThreadMetadata, {
      threadId: 'thread-backfill-1',
    })

    expect(result.success).toBe(true)
    expect(result.messageCount).toBe(10)

    const threadMetadata = await t.run(async (ctx) => {
      return await ctx.db
        .query('threadMetadata')
        .withIndex('by_threadId', (q) => q.eq('threadId', 'thread-backfill-1'))
        .first()
    })

    expect(threadMetadata?.metadata.messageCount).toBe(10)
  })

  it('should handle threads with no messages gracefully', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      await ctx.db.insert('threadMetadata', {
        threadId: 'thread-empty-1',
        emoji: '💬',
        userId,
        title: 'Empty Thread',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          messageCount: 0,
          isPinned: false,
        },
      })
    })

    const result = await t.mutation(api.migrations.backfillThreadMetadata, {
      threadId: 'thread-empty-1',
    })

    expect(result.success).toBe(true)
    expect(result.messageCount).toBe(0)

    const threadMetadata = await t.run(async (ctx) => {
      return await ctx.db
        .query('threadMetadata')
        .withIndex('by_threadId', (q) => q.eq('threadId', 'thread-empty-1'))
        .first()
    })

    expect(threadMetadata?.metadata.messageCount).toBe(0)
  })

  it('should handle non-existent thread gracefully', async () => {
    const t = convexTest(schema)

    const result = await t.mutation(api.migrations.backfillThreadMetadata, {
      threadId: 'non-existent-thread',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should batch process multiple threads efficiently', async () => {
    const t = convexTest(schema)

    const threadIds = await t.run(async (ctx) => {
      const ids = []
      for (let i = 0; i < 50; i++) {
        const threadId = `batch-thread-${i}`
        await ctx.db.insert('threadMetadata', {
          threadId,
          emoji: '💬',
          userId,
          title: `Thread ${i}`,
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })

        const messageCount = Math.floor(Math.random() * 20) + 1
        for (let j = 0; j < messageCount; j++) {
          await ctx.db.insert('messages', {
            body: `Message ${j}`,
            userId,
            role: j % 2 === 0 ? 'user' : 'assistant',
          })
        }
        ids.push(threadId)
      }
      return ids
    })

    let processedCount = 0
    for (const threadId of threadIds) {
      const result = await t.mutation(api.migrations.backfillThreadMetadata, {
        threadId,
      })
      expect(result.success).toBe(true)
      processedCount++
    }

    expect(processedCount).toBe(50)

    const threadMetadatas = await t.run(async (ctx) => {
      return await ctx.db.query('threadMetadata').collect()
    })

    const allHaveCounts = threadMetadatas.every(
      (tm) => tm.metadata.messageCount > 0,
    )
    expect(allHaveCounts).toBe(true)
  })

  it('should not affect projectId field (should remain null/undefined)', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      await ctx.db.insert('threadMetadata', {
        threadId: 'thread-projectid-1',
        emoji: '💬',
        userId,
        title: 'Test Thread',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        projectId: undefined,
        metadata: {
          messageCount: 0,
          isPinned: false,
        },
      })

      await ctx.db.insert('messages', {
        body: 'Test message',
        userId,
        role: 'user',
      })
    })

    await t.mutation(api.migrations.backfillThreadMetadata, {
      threadId: 'thread-projectid-1',
    })

    const threadMetadata = await t.run(async (ctx) => {
      return await ctx.db
        .query('threadMetadata')
        .withIndex('by_threadId', (q) => q.eq('threadId', 'thread-projectid-1'))
        .first()
    })

    expect(threadMetadata?.projectId).toBeUndefined()
  })

  it('should get migration stats accurately', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      await ctx.db.insert('threadMetadata', {
        threadId: 'thread-stats-1',
        emoji: '💬',
        userId,
        title: 'Thread with messages',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          messageCount: 5,
          isPinned: false,
        },
      })

      await ctx.db.insert('threadMetadata', {
        threadId: 'thread-stats-2',
        emoji: '💬',
        userId,
        title: 'Thread without messages',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          messageCount: 0,
          isPinned: false,
        },
      })

      for (let i = 0; i < 5; i++) {
        await ctx.db.insert('messages', {
          body: `Message ${i}`,
          userId,
          role: 'user',
        })
      }
    })

    const stats = await t.query(api.migrations.getMigrationStats)

    expect(stats.totalThreads).toBe(2)
    expect(stats.threadsWithZeroCount).toBe(1)
    expect(stats.threadsWithCounts).toBe(1)
    expect(stats.totalMessages).toBe(5)
  })

  it('should backfill all threads in batch', async () => {
    const t = convexTest(schema)

    await t.run(async (ctx) => {
      for (let i = 0; i < 20; i++) {
        const threadId = `batch-all-thread-${i}`
        await ctx.db.insert('threadMetadata', {
          threadId,
          emoji: '💬',
          userId,
          title: `Thread ${i}`,
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
      }

      const totalMessages = 10
      for (let j = 0; j < totalMessages; j++) {
        await ctx.db.insert('messages', {
          body: `Message ${j}`,
          userId,
          role: 'user',
        })
      }
    })

    const result = await t.mutation(api.migrations.backfillAllThreadMetadata, {
      batchSize: 5,
    })

    expect(result.total).toBe(20)
    expect(result.processed).toBe(20)
    expect(result.skipped).toBe(0)
    expect(result.errors).toBe(0)

    const threadMetadatas = await t.run(async (ctx) => {
      return await ctx.db.query('threadMetadata').collect()
    })

    const allHaveCounts = threadMetadatas.every(
      (tm) => tm.metadata.messageCount === 10,
    )
    expect(allHaveCounts).toBe(true)
  })
})
