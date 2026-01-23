/* eslint-disable @typescript-eslint/no-unsafe-return */
import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

describe('Thread Attachment API', () => {
  let t: ReturnType<typeof convexTest>
  let userId: Id<'users'>
  let projectId: Id<'projects'>

  beforeEach(async () => {
    t = convexTest(schema)
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
    it('should attach thread to project and update lastActiveAt and log audit', async () => {
      const threadId = 'thread-attach-1'

      const threadMetaId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId,
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

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId,
        })) as { success: boolean; threadId: string; projectId: Id<'projects'> }

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.projectId).toBe(projectId)

      const thread = (await t.run(async (ctx) => {
        return await ctx.db.get('threadMetadata', threadMetaId)
      })) as { projectId: Id<'projects'> }

      expect(thread.projectId).toBe(projectId)

      const project = (await t.run(async (ctx) => {
        return (await ctx.db.get('projects', projectId))!
      })) as { lastActiveAt: number; createdAt: number }

      expect(project.lastActiveAt).toBeGreaterThan(project.createdAt)

      const auditLogs = (await t.run(async (ctx) => {
        return await ctx.db
          .query('auditLogs')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .collect()
      })) as Array<{ action: string; entityId: string }>

      expect(auditLogs.length).toBe(1)
      expect(auditLogs[0].action).toBe('attach_thread_to_project')
      expect(auditLogs[0].entityId).toBe(threadId)
    })

    it('should reject if thread not found', async () => {
      const fakeThreadId = 'non-existent-thread'

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId: fakeThreadId,
          projectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Thread not found')
    })

    it('should reject if user does not own thread', async () => {
      const threadId = 'thread-unauthorized-1'

      const otherUserId = await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })

      await t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          userId, // Owned by first user
          threadId,
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
      })

      const result = (await t
        .withIdentity({ subject: otherUserId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should reject if project not found', async () => {
      const threadId = 'thread-no-project-1'

      await t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          userId,
          threadId,
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
      })

      // Generate a valid but non-existent ID
      const fakeProjectId = (await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Temp Project',
          createdAt: 0,
          lastActiveAt: 0,
          metadata: {},
        })
        await ctx.db.delete('projects', id)
        return id
      })) as Id<'projects'>

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId: fakeProjectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })

    it('should reject if user does not own project', async () => {
      const threadId = 'thread-other-user-1'

      const otherUserId = (await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })) as Id<'users'>

      const otherProjectId = (await t.run(async (ctx) => {
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
      })) as Id<'projects'>

      await t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          userId, // Owned by userId
          threadId,
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
      })

      // Acting as userId, trying to attach to otherProjectId
      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.attachThreadToProject, {
          threadId,
          projectId: otherProjectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  describe('detachThreadFromProject', () => {
    it('should detach thread from project and update project lastActiveAt and log audit', async () => {
      const threadId = 'thread-detach-1'

      const projectLastActive = Date.now() - 86400000

      // Update project lastActiveAt to be in the past
      await t.run(async (ctx) => {
        await ctx.db.patch('projects', projectId, {
          lastActiveAt: projectLastActive,
        })
      })

      const threadMetaId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId,
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

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.detachThreadFromProject, {
          threadId,
        })) as { success: boolean; threadId: string }

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)

      const thread = (await t.run(async (ctx) => {
        return await ctx.db.get('threadMetadata', threadMetaId)
      })) as { projectId?: Id<'projects'> }

      expect(thread.projectId).toBeUndefined()

      const project = (await t.run(async (ctx) => {
        return (await ctx.db.get('projects', projectId))!
      })) as { lastActiveAt: number }

      expect(project.lastActiveAt).toBeGreaterThan(projectLastActive)

      const auditLogs = (await t.run(async (ctx) => {
        return await ctx.db
          .query('auditLogs')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .collect()
      })) as Array<{ action: string }>

      expect(
        auditLogs.some((log) => log.action === 'detach_thread_from_project'),
      ).toBe(true)
    })

    it('should reject if thread not found', async () => {
      const fakeThreadId = 'non-existent-thread'

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.detachThreadFromProject, {
          threadId: fakeThreadId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Thread not found')
    })

    it('should reject if user does not own thread', async () => {
      const threadId = 'thread-other-user-2'

      const otherUserId = (await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })) as Id<'users'>

      await t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          userId, // Owned by userId
          threadId,
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
      })

      const result = (await t
        .withIdentity({ subject: otherUserId })
        .mutation(api.threads.detachThreadFromProject, {
          threadId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  describe('moveThreadToProject', () => {
    it('should move thread between projects and update both lastActiveAt and log audit', async () => {
      const threadId = 'thread-move-1'

      const oldProjectLastActive = Date.now() - 86400000
      const newProjectLastActive = Date.now() - 43200000

      const oldProjectId = (await t.run(async (ctx) => {
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
      })) as Id<'projects'>

      const newProjectId = (await t.run(async (ctx) => {
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
      })) as Id<'projects'>

      const threadMetaId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('threadMetadata', {
          userId,
          threadId,
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

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.moveThreadToProject, {
          threadId,
          newProjectId,
        })) as {
        success: boolean
        threadId: string
        oldProjectId: Id<'projects'>
        newProjectId: Id<'projects'>
      }

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.oldProjectId).toBe(oldProjectId)
      expect(result.newProjectId).toBe(newProjectId)

      const thread = (await t.run(async (ctx) => {
        return await ctx.db.get('threadMetadata', threadMetaId)
      })) as { projectId: Id<'projects'> }

      expect(thread.projectId).toBe(newProjectId)

      const oldProject = (await t.run(async (ctx) => {
        return (await ctx.db.get('projects', oldProjectId))!
      })) as { lastActiveAt: number }

      const newProject = (await t.run(async (ctx) => {
        return (await ctx.db.get('projects', newProjectId))!
      })) as { lastActiveAt: number }

      expect(oldProject.lastActiveAt).toBeGreaterThan(oldProjectLastActive)
      expect(newProject.lastActiveAt).toBeGreaterThan(newProjectLastActive)

      const auditLogs = (await t.run(async (ctx) => {
        return await ctx.db
          .query('auditLogs')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .collect()
      })) as Array<{ action: string }>

      expect(
        auditLogs.some((log) => log.action === 'move_thread_to_project'),
      ).toBe(true)
    })

    it('should handle same project (already attached)', async () => {
      const threadId = 'thread-same-project-1'

      const projectLastActive = Date.now()

      const currentProjectId = (await t.run(async (ctx) => {
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
      })) as Id<'projects'>

      await t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          userId,
          threadId,
          emoji: '💬',
          title: 'Test Thread',
          mode: 'think',
          projectId: currentProjectId,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            messageCount: 0,
            isPinned: false,
          },
        })
      })

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.moveThreadToProject, {
          threadId,
          newProjectId: currentProjectId,
        })) as {
        success: boolean
        threadId: string
        oldProjectId: Id<'projects'>
        newProjectId: Id<'projects'>
      }

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.oldProjectId).toBe(currentProjectId)
      expect(result.newProjectId).toBe(currentProjectId)

      const project = (await t.run(async (ctx) => {
        return (await ctx.db.get('projects', currentProjectId))!
      })) as { lastActiveAt: number }

      // Should NOT have updated lastActiveAt if same project
      expect(project.lastActiveAt).toBe(projectLastActive)
    })

    it('should handle moving to non-existent project', async () => {
      const threadId = 'thread-move-invalid-1'

      const oldProjectId = (await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Old Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })) as Id<'projects'>

      await t.run(async (ctx) => {
        await ctx.db.insert('threadMetadata', {
          userId,
          threadId,
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
      })

      // Generate a valid but non-existent ID
      const fakeProjectId = (await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Temp Project 2',
          createdAt: 0,
          lastActiveAt: 0,
          metadata: {},
        })
        await ctx.db.delete('projects', id)
        return id
      })) as Id<'projects'>

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.moveThreadToProject, {
          threadId,
          newProjectId: fakeProjectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })
  })

  describe('createThreadInProject', () => {
    it('should create thread in project with projectId set and update project lastActiveAt', async () => {
      const threadId = 'thread-create-in-project-1'

      const projectLastActive = Date.now() - 86400000

      await t.run(async (ctx) => {
        await ctx.db.patch('projects', projectId, {
          lastActiveAt: projectLastActive,
        })
      })

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.createThreadInProject, {
          threadId,
          projectId,
        })) as {
        success: boolean
        threadId: string
        projectId: Id<'projects'>
        title: string
      }

      expect(result.success).toBe(true)
      expect(result.threadId).toBe(threadId)
      expect(result.projectId).toBe(projectId)
      expect(result.title).toBe('New conversation')

      const thread = (await t.run(async (ctx) => {
        return await ctx.db
          .query('threadMetadata')
          .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
          .first()
      })) as { projectId: Id<'projects'>; title: string; userId: Id<'users'> }

      expect(thread).toBeDefined()
      expect(thread.projectId).toBe(projectId)
      expect(thread.title).toBe('New conversation')
      expect(thread.userId).toBe(userId)

      const project = (await t.run(async (ctx) => {
        return (await ctx.db.get('projects', projectId))!
      })) as { lastActiveAt: number }

      expect(project.lastActiveAt).toBeGreaterThan(projectLastActive)
    })

    it('should reject if project not found', async () => {
      const threadId = 'thread-no-project-2'

      const fakeProjectId = (await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Temp Project 3',
          createdAt: 0,
          lastActiveAt: 0,
          metadata: {},
        })
        await ctx.db.delete('projects', id)
        return id
      })) as Id<'projects'>

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.createThreadInProject, {
          threadId,
          projectId: fakeProjectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Project not found')
    })

    it('should reject if user does not own project', async () => {
      const threadId = 'thread-unauthorized-project'

      const otherUserId = (await t.run(async (ctx) => {
        const user = await ctx.db.insert('users', {
          name: 'Other User',
          email: 'other2@example.com',
          emailVerificationTime: 0,
          isAnonymous: false,
        })
        return user
      })) as Id<'users'>

      const otherProjectId = (await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId: otherUserId,
          name: 'Other Project 2',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return id
      })) as Id<'projects'>

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.createThreadInProject, {
          threadId,
          projectId: otherProjectId,
        })) as { success: boolean; error: string }

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should generate human-readable title "New conversation"', async () => {
      const threadId = 'thread-title-check-1'

      const result = (await t
        .withIdentity({ subject: userId })
        .mutation(api.threads.createThreadInProject, {
          threadId,
          projectId,
        })) as { success: boolean; title: string }

      expect(result.success).toBe(true)
      expect(result.title).toBe('New conversation')
    })
  })
})
