import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

describe('Thread Attachment API', () => {
  let userId: Id<'users'>
  let projectId: Id<'projects'>

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

    projectId = await t.run(async (ctx) => {
      const id = await ctx.db.insert('projects', {
        userId,
        name: 'Test Project',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        metadata: {
          description: undefined,
          icon: undefined,
          color: undefined,
        },
      })
      return id
    })
  })

  describe('attachThreadToProject', () => {
    it('should attach thread to project and update lastActiveAt', async () => {
      const t = convexTest(schema)

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-attach-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId,
        })

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.projectId).toBe(projectId)

      const thread = await t.run(async (ctx) => {
        return await ctx.db.get(threadId!)
      })

      expect(thread!.projectId).toBe(projectId)

      const project = await t.run(async (ctx) => {
        return await ctx.db.get(projectId)
      })

      expect(project!.lastActiveAt).toBeGreaterThan(project.createdAt)
    })

    it('should reject if thread not found', async () => {
      const t = convexTest(schema)

      const fakeThreadId = 'non-existent-thread'

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId: fakeThreadId,
          projectId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Thread not found')
    })

    it('should reject if user does not own thread', async () => {
      const t = convexTest(schema)

      const otherUserId = await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-unauthorized-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: otherUserId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should reject if project not found', async () => {
      const t = convexTest(schema)

      const fakeProjectId =
        '00000000000000000000000' as unknown as Id<'projects'>

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-no-project-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId: fakeProjectId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })

    it('should reject if user does not own project', async () => {
      const t = convexTest(schema)

      const otherUserId = await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })

      const otherProjectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-other-user-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          projectId: otherProjectId,
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: otherUserId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId: otherProjectId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  describe('detachThreadFromProject', () => {
    it('should detach thread from project and update project lastActiveAt', async () => {
      const t = convexTest(schema)

      const projectLastActive = Date.now() - 86400000

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-detach-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          projectId,
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.detachThreadFromProject, {
          threadId,
        })

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)

      const thread = await t.run(async (ctx) => {
        return await ctx.db.get(threadId!)
      })

      expect(thread!.projectId).toBeUndefined()

      const project = await t.run(async (ctx) => {
        return await ctx.db.get(projectId)
      })

      expect(project!.lastActiveAt).toBeGreaterThan(projectLastActive)
    })

    it('should reject if thread not found', async () => {
      const t = convexTest(schema)

      const fakeThreadId = 'non-existent-thread'

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.detachThreadFromProject, {
          threadId: fakeThreadId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Thread not found')
    })

    it('should reject if user does not own thread', async () => {
      const t = convexTest(schema)

      const otherUserId = await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-other-user-2',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          projectId,
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: otherUserId })
        .mutation(api.threads.detachThreadFromProject, {
          threadId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  describe('moveThreadToProject', () => {
    it('should move thread between projects and update both lastActiveAt', async () => {
      const t = convexTest(schema)

      const oldProjectLastActive = Date.now() - 86400000
      const newProjectLastActive = Date.now()

      const oldProjectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Old Project',
          createdAt: Date.now(),
          lastActiveAt: oldProjectLastActive,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })

      const newProjectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'New Project',
          createdAt: Date.now(),
          lastActiveAt: newProjectLastActive,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-move-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          projectId: oldProjectId,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.moveThreadToProject, {
          threadId,
          newProjectId,
        })

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.oldProjectId).toBe(oldProjectId)
      expect(result.newProjectId).toBe(newProjectId)

      const thread = await t.run(async (ctx) => {
        return await ctx.db.get(threadId!)
      })

      expect(thread!.projectId).toBe(newProjectId)

      const oldProject = await t.run(async (ctx) => {
        return await ctx.db.get(oldProjectId!)
      })

      const newProject = await t.run(async (ctx) => {
        return await ctx.db.get(newProjectId!)
      })

      expect(oldProject!.lastActiveAt).toBe(newProjectLastActive)
      expect(newProject!.lastActiveAt).toBe(newProjectLastActive)
    })

    it('should handle same project (already attached)', async () => {
      const t = convexTest(schema)

      const projectLastActive = Date.now()

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          createdAt: Date.now(),
          lastActiveAt: projectLastActive,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-same-project-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          projectId,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.moveThreadToProject, {
          threadId,
          newProjectId: projectId,
        })

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.oldProjectId).toBe(projectId)
      expect(result.newProjectId).toBe(projectId)

      const thread = await t.run(async (ctx) => {
        return await ctx.db.get(threadId!)
      })

      expect(thread!.projectId).toBe(projectId)

      const project = await t.run(async (ctx) => {
        return await ctx.db.get(projectId!)
      })

      expect(project!.lastActiveAt).toBe(projectLastActive)
    })

    it('should handle moving to non-existent project', async () => {
      const t = convexTest(schema)

      const projectLastActive = Date.now()

      const oldProjectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Old Project',
          createdAt: Date.now(),
          lastActiveAt: projectLastActive,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })

      const threadId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId: 'thread-move-invalid-1',
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          projectId: oldProjectId,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
        return id
      })

      const fakeProjectId =
        '00000000000000000000000' as unknown as Id<'projects'>

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.moveThreadToProject, {
          threadId,
          newProjectId: fakeProjectId,
        })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })
  })
})
