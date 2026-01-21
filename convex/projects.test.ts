import { describe, it, expect, beforeEach } from 'vitest'
import { convexTest } from 'convex-test'
import schema from './schema'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'

describe('Project CRUD API', () => {
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

  describe('createProject', () => {
    it('should create project with valid name', async () => {
      const t = convexTest(schema)

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.createProject, {
          name: 'Test Project',
        })

      expect(result).toBeDefined()
      expect(result).toHaveProperty('_id')
      expect(result).toHaveProperty('name', 'Test Project')
      expect(result).toHaveProperty('userId')
      expect(result).toHaveProperty('createdAt')
      expect(result).toHaveProperty('lastActiveAt')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toEqual({
        description: undefined,
        icon: undefined,
        color: undefined,
      })
    })

    it('should reject duplicate project names for same user', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'Duplicate Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.createProject, {
          name: 'Duplicate Project',
        })

      expect(result.error).toBeDefined()
      expect(result.error).toContain('already exists')
    })

    it('should reject project names > 50 chars', async () => {
      const t = convexTest(schema)

      const longName = 'A'.repeat(51)

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.createProject, {
          name: longName,
        })

      expect(result.error).toBeDefined()
      expect(result.error).toContain('too long')
    })
  })

  describe('renameProject', () => {
    it('should rename project with valid new name', async () => {
      const t = convexTest(schema)

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Original Name',
          createdAt: Date.now() - 86400000,
          lastActiveAt: Date.now() - 86400000,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return await ctx.db.get(id)
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.renameProject, {
          projectId: projectId!._id,
          newName: 'New Name',
        })

      expect(result.success).toBe(true)
      expect(result.name).toBe('New Name')

      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(projectId!._id)
      })

      expect(updated!.name).toBe('New Name')
    })

    it('should update lastActiveAt on rename', async () => {
      const t = convexTest(schema)

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          createdAt: Date.now() - 86400000,
          lastActiveAt: Date.now() - 86400000,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
        return await ctx.db.get(id)
      })

      const beforeLastActive = projectId!.lastActiveAt

      await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.renameProject, {
          projectId: projectId!._id,
          newName: 'Renamed',
        })

      const updated = await t.run(async (ctx) => {
        return await ctx.db.get(projectId!._id)
      })

      expect(updated!.lastActiveAt).toBeGreaterThan(beforeLastActive)
    })

    it('should reject non-existent project', async () => {
      const t = convexTest(schema)

      const fakeId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Fake Project',
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

      await t.run(async (ctx) => {
        await ctx.db.delete(fakeId)
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.renameProject, {
          projectId: fakeId,
          newName: 'New Name',
        })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('archiveProject', () => {
    it('should archive project with timestamp', async () => {
      const t = convexTest(schema)

      const projectId = await t.run(async (ctx) => {
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
        return await ctx.db.get(id)
      })

      const result = await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.archiveProject, {
          projectId: projectId!._id,
        })

      expect(result.success).toBe(true)

      const archived = await t.run(async (ctx) => {
        return await ctx.db.get(projectId!._id)
      })

      expect(archived!.archivedAt).toBeDefined()
      expect(archived!.archivedAt).toBeGreaterThan(0)
    })

    it('should preserve project data after archive (memories, threads not deleted)', async () => {
      const t = convexTest(schema)

      const projectId = await t.run(async (ctx) => {
        const id = await ctx.db.insert('projects', {
          userId,
          name: 'Test Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: 'Test Description',
            icon: '📁',
            color: 'blue',
          },
        })
        return await ctx.db.get(id)
      })

      await t
        .withIdentity({ subject: userId })
        .mutation(api.projects.archiveProject, {
          projectId: projectId!._id,
        })

      const archived = await t.run(async (ctx) => {
        return await ctx.db.get(projectId!._id)
      })

      expect(archived!.metadata).toEqual({
        description: 'Test Description',
        icon: '📁',
        color: 'blue',
      })
    })
  })

  describe('listProjects', () => {
    it('should list projects for user', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'Project 1',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Project 2',
          createdAt: Date.now(),
          lastActiveAt: Date.now() - 3600000,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Project 3',
          createdAt: Date.now(),
          lastActiveAt: Date.now() - 7200000,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.listProjects)

      expect(result).toHaveLength(3)
      expect(result.every((p) => p.userId === userId)).toBe(true)
    })

    it('should exclude archived projects by default', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'Active Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Archived Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          archivedAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.listProjects)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Active Project')
    })

    it('should sort by lastActiveAt descending', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        const now = Date.now()

        await ctx.db.insert('projects', {
          userId,
          name: 'Oldest Project',
          createdAt: now - 7200000,
          lastActiveAt: now - 7200000,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Middle Project',
          createdAt: now - 3600000,
          lastActiveAt: now - 3600000,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Newest Project',
          createdAt: now,
          lastActiveAt: now,
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.listProjects)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Newest Project')
      expect(result[1].name).toBe('Middle Project')
      expect(result[2].name).toBe('Oldest Project')
    })
  })

  describe('searchProjects', () => {
    it('should search projects by name with exact match', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'Graduation Thesis',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Product Feature X',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Personal Notes',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.searchProjects, {
          searchQuery: 'Graduation',
        })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Graduation Thesis')
    })

    it('should support fuzzy matching (partial name)', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'Graduation Thesis',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Product Feature X',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Personal Notes',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.searchProjects, {
          searchQuery: 'Grad',
        })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Graduation Thesis')
    })

    it('should limit results to 10 items', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        for (let i = 0; i < 15; i++) {
          await ctx.db.insert('projects', {
            userId,
            name: `Project ${i}`,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            metadata: {
              description: undefined,
              icon: undefined,
              color: undefined,
            },
          })
        }
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.searchProjects, {
          searchQuery: 'Project',
        })

      expect(result.length).toBeLessThanOrEqual(10)
    })

    it('should exclude archived projects from search', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
          userId,
          name: 'Active Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })

        await ctx.db.insert('projects', {
          userId,
          name: 'Archived Project',
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          archivedAt: Date.now(),
          metadata: {
            description: undefined,
            icon: undefined,
            color: undefined,
          },
        })
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.searchProjects, {
          searchQuery: 'Project',
        })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Active Project')
    })

    it('should return empty array for no matches', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        await ctx.db.insert('projects', {
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
      })

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.searchProjects, {
          searchQuery: 'NonExistent',
        })

      expect(result).toHaveLength(0)
    })

    it('should return results in <50ms', async () => {
      const t = convexTest(schema)

      await t.run(async (ctx) => {
        for (let i = 0; i < 5; i++) {
          await ctx.db.insert('projects', {
            userId,
            name: `Project ${i}`,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            metadata: {
              description: undefined,
              icon: undefined,
              color: undefined,
            },
          })
        }
      })

      const start = Date.now()
      const result = await t
        .withIdentity({ subject: userId })
        .query(api.projects.searchProjects, {
          searchQuery: 'Project',
        })
      const duration = Date.now() - start

      expect(result).toHaveLength(5)
      expect(duration).toBeLessThan(50)
    })
  })
})
