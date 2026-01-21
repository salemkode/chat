import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

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

describe('Schema Validation: Projects Table', () => {
  it('should define projects table with required fields', async () => {
    const t = convexTest(schema)

    const projectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Test Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        archivedAt: undefined,
        metadata: {
          description: 'A test project',
          icon: 'folder',
          color: '#3b82f6',
        },
      })
    })

    expect(projectId).toBeDefined()
  })

  it('should require project name to be a string', async () => {
    const t = convexTest(schema)

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 123 as any,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {},
        })
      }),
    ).rejects.toThrow()
  })

  it('should allow optional archivedAt timestamp', async () => {
    const t = convexTest(schema)

    const projectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Archived Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        archivedAt: Date.now(),
        metadata: {},
      })
    })

    expect(projectId).toBeDefined()
  })
})

describe('Schema Validation: Threads Table (threadMetadata)', () => {
  it('should define threadMetadata table with required fields', async () => {
    const t = convexTest(schema)

    const threadId = await t.run(async (ctx) => {
      return await ctx.db.insert('threadMetadata', {
        threadId: 'thread-123',
        emoji: '💬',
        sectionId: undefined,
        userId,
        projectId: undefined,
        title: 'New Conversation',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          messageCount: 0,
          lastModel: 'gpt-4-turbo',
          isPinned: false,
        },
      })
    })

    expect(threadId).toBeDefined()
  })

  it('should allow optional projectId in threadMetadata', async () => {
    const t = convexTest(schema)

    const threadId = await t.run(async (ctx) => {
      return await ctx.db.insert('threadMetadata', {
        threadId: 'thread-123',
        emoji: '💬',
        sectionId: undefined,
        userId,
        projectId: undefined,
        title: 'Free Chat',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          messageCount: 0,
          isPinned: false,
        },
      })
    })

    expect(threadId).toBeDefined()
  })

  it('should require mode to be one of: code, learn, think, create', async () => {
    const t = convexTest(schema)

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          threadId: 'thread-123',
          emoji: '💬',
          userId,
          title: 'Test Thread',
          mode: 'invalid' as any,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
      }),
    ).rejects.toThrow()
  })
})

describe('Schema Validation: Memories Table', () => {
  it('should define memories table with vector index', async () => {
    const t = convexTest(schema)

    const memoryId = await t.run(async (ctx) => {
      const embedding = new Array(1536).fill(0.1)
      return await ctx.db.insert('memories', {
        userId,
        scope: 'project',
        scopeId: 'project-123',
        content: 'This is a test memory about project structure',
        embedding,
        relevanceScore: 0.8,
        recencyScore: 1.0,
        importanceScore: 0.5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          source: 'user',
          tags: ['project', 'structure'],
        },
      })
    })

    expect(memoryId).toBeDefined()
  })

  it('should store embedding as array of floats', async () => {
    const t = convexTest(schema)

    const memoryId = await t.run(async (ctx) => {
      const embedding = new Array(1536).fill(0.1)
      return await ctx.db.insert('memories', {
        userId,
        scope: 'project',
        scopeId: 'project-123',
        content: 'Test memory',
        embedding,
        relevanceScore: 0.5,
        recencyScore: 1.0,
        importanceScore: 0.5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {},
      })
    })

    expect(memoryId).toBeDefined()

    const memory = await t.run(async (ctx) => {
      return await ctx.db.get(memoryId)
    })

    expect(memory?.embedding).toBeDefined()
    expect(Array.isArray(memory?.embedding)).toBe(true)
  })

  it('should require scope to be one of: profile, skill, project, thread, pinned', async () => {
    const t = convexTest(schema)

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('memories', {
          userId,
          scope: 'invalid' as any,
          scopeId: 'test-id',
          content: 'Test memory',
          embedding: new Array(1536).fill(0.1),
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
      }),
    ).rejects.toThrow()
  })

  it('should allow all valid scope types', async () => {
    const t = convexTest(schema)

    const validScopes: Array<
      'profile' | 'skill' | 'project' | 'thread' | 'pinned'
    > = ['profile', 'skill', 'project', 'thread', 'pinned']

    for (const scope of validScopes) {
      const memoryId = await t.run(async (ctx) => {
        return await ctx.db.insert('memories', {
          userId,
          scope,
          scopeId: 'test-id',
          content: `Test memory for ${scope}`,
          embedding: new Array(1536).fill(0.1),
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
      })
      expect(memoryId).toBeDefined()
    }
  })
})

describe('Schema Validation: ProjectMentions Table', () => {
  let projectId: Id<'projects'>

  beforeEach(async () => {
    const t = convexTest(schema)
    projectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Test Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {},
      })
    })
  })

  it('should define projectMentions table with required fields', async () => {
    const t = convexTest(schema)

    const threadId = await t.run(async (ctx) => {
      return await ctx.db.insert('threadMetadata', {
        threadId: 'thread-123',
        emoji: '💬',
        userId,
        title: 'Test Thread',
        mode: 'think',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          messageCount: 0,
          isPinned: false,
        },
      })
    })

    const messageId = await t.run(async (ctx) => {
      return await ctx.db.insert('messages', {
        body: 'Test message with @Project',
        userId,
        role: 'user',
      })
    })

    const mentionId = await t.run(async (ctx) => {
      return await ctx.db.insert('projectMentions', {
        userId,
        threadId: 'thread-123',
        projectId,
        messageId: messageId.toString(),
        mentionedAt: Date.now(),
        attachmentOffered: true,
        attachmentAccepted: undefined,
      })
    })

    expect(mentionId).toBeDefined()
  })

  it('should require attachmentOffered to be boolean', async () => {
    const t = convexTest(schema)

    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert('projectMentions', {
          userId,
          threadId: 'thread-123',
          projectId,
          messageId: 'msg-123',
          mentionedAt: Date.now(),
          attachmentOffered: 'true' as any,
          attachmentAccepted: undefined,
        })
      }),
    ).rejects.toThrow()
  })

  it('should allow optional attachmentAccepted field', async () => {
    const t = convexTest(schema)

    const mentionId1 = await t.run(async (ctx) => {
      return await ctx.db.insert('projectMentions', {
        userId,
        threadId: 'thread-123',
        projectId,
        messageId: 'msg-1',
        mentionedAt: Date.now(),
        attachmentOffered: true,
        attachmentAccepted: undefined,
      })
    })

    expect(mentionId1).toBeDefined()

    const mentionId2 = await t.run(async (ctx) => {
      return await ctx.db.insert('projectMentions', {
        userId,
        threadId: 'thread-123',
        projectId,
        messageId: 'msg-2',
        mentionedAt: Date.now(),
        attachmentOffered: true,
        attachmentAccepted: true,
      })
    })

    expect(mentionId2).toBeDefined()
  })
})

describe('Schema Validation: Indexes', () => {
  it('should create by_user index on projects table', async () => {
    const t = convexTest(schema)

    const projects = await t.run(async (ctx) => {
      const ids = []
      for (let i = 0; i < 5; i++) {
        const id = await ctx.db.insert('projects', {
          userId,
          name: `Project ${i}`,
          createdAt: Date.now() + i * 1000,
          lastActiveAt: Date.now() + i * 1000,
          metadata: {},
        })
        ids.push(id)
      }
      return ids
    })

    const retrievedProjects = await t.run(async (ctx) => {
      return await ctx.db
        .query('projects')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect()
    })

    expect(retrievedProjects).toHaveLength(5)
    expect(retrievedProjects.every((p) => p.userId === userId)).toBe(true)
  })

  it('should create by_user_archived index on projects table', async () => {
    const t = convexTest(schema)

    const projectId1 = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Active Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        archivedAt: undefined,
        metadata: {},
      })
    })

    const projectId2 = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Archived Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        archivedAt: Date.now(),
        metadata: {},
      })
    })

    expect(projectId1).toBeDefined()
    expect(projectId2).toBeDefined()
  })

  it('should create vector index on memories table', async () => {
    const t = convexTest(schema)

    const memoryIds = await t.run(async (ctx) => {
      const ids = []
      for (let i = 0; i < 10; i++) {
        const embedding = new Array(1536).fill(0.1 + i * 0.01)
        const id = await ctx.db.insert('memories', {
          userId,
          scope: 'project',
          scopeId: 'project-123',
          content: `Memory ${i} with different content for testing vector search`,
          embedding,
          relevanceScore: 0.5,
          recencyScore: 1.0,
          importanceScore: 0.5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        })
        ids.push(id)
      }
      return ids
    })

    expect(memoryIds).toHaveLength(10)
  })
})

describe('Schema Type Checking', () => {
  it('should pass TypeScript type checking', async () => {
    const t = convexTest(schema)

    const projectId = await t.run(async (ctx) => {
      return await ctx.db.insert('projects', {
        userId,
        name: 'Type Check Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          description: 'Testing TypeScript types',
          icon: 'test',
          color: '#123456',
        },
      })
    })

    expect(projectId).toBeDefined()

    const project = await t.run(async (ctx) => {
      return await ctx.db.get(projectId)
    })

    expect(project).toBeDefined()
    expect(project?.userId).toBe(userId)
    expect(project?.name).toBe('Type Check Project')
  })
})
