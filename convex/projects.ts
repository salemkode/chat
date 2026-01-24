import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

export const createProject = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    if (args.name.length > 50) {
      return {
        error: 'Project name is too long (max 50 characters)',
      }
    }

    if (!/^[a-zA-Z0-9\s-]+$/.test(args.name)) {
      return {
        error:
          'Project name contains invalid characters (only letters, numbers, and spaces allowed)',
      }
    }

    const existing = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
      .then((projects) =>
        projects.find(
          (p) => p.name === args.name && p.archivedAt === undefined,
        ),
      )

    if (existing) {
      return {
        error: `Project "${args.name}" already exists`,
      }
    }

    const now = Date.now()

    const projectId = await ctx.db.insert('projects', {
      userId,
      name: args.name,
      createdAt: now,
      lastActiveAt: now,
      metadata: {
        description: undefined,
        icon: undefined,
        color: undefined,
      },
    })

    return {
      _id: projectId,
      userId,
      name: args.name,
      createdAt: now,
      lastActiveAt: now,
      metadata: {
        description: undefined,
        icon: undefined,
        color: undefined,
      },
    }
  },
})

export const renameProject = mutation({
  args: {
    projectId: v.id('projects'),
    newName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get('projects', args.projectId)
    if (!project) {
      return {
        success: false,
        error: 'Project not found',
      }
    }

    if (project.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    if (args.newName.length > 50) {
      return {
        success: false,
        error: 'Project name is too long (max 50 characters)',
      }
    }

    if (!/^[a-zA-Z0-9\s-]+$/.test(args.newName)) {
      return {
        success: false,
        error:
          'Project name contains invalid characters (only letters, numbers, and spaces allowed)',
      }
    }

    const existing = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
      .then((projects) =>
        projects.find(
          (p) => p.name === args.newName && p.archivedAt === undefined,
        ),
      )

    if (existing) {
      return {
        success: false,
        error: `Project "${args.newName}" already exists`,
      }
    }

    await ctx.db.patch('projects', args.projectId, {
      name: args.newName,
      lastActiveAt: Date.now(),
    })

    return {
      success: true,
      name: args.newName,
    }
  },
})

export const archiveProject = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get('projects', args.projectId)
    if (!project) {
      return {
        success: false,
        error: 'Project not found',
      }
    }

    if (project.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    await ctx.db.patch('projects', args.projectId, {
      archivedAt: Date.now(),
    })

    return {
      success: true,
    }
  },
})

export const listProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user_archived', (q) =>
        q.eq('userId', userId).eq('archivedAt', undefined),
      )
      .collect()
      .then((projects) =>
        projects.sort((a, b) => b.lastActiveAt - a.lastActiveAt),
      )

    return projects
  },
})

export const updateLastActiveAt = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get('projects', args.projectId)

    if (!project) {
      return {
        success: false,
        error: 'Project not found',
      }
    }

    if (project.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    await ctx.db.patch('projects', args.projectId, {
      lastActiveAt: Date.now(),
    })

    return {
      success: true,
    }
  },
})

export const searchProjects = query({
  args: {
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    const projects = await ctx.db
      .query('projects')
      .withSearchIndex('search_name', (q) =>
        q
          .search('name', args.searchQuery)
          .eq('userId', userId)
          .eq('archivedAt', undefined),
      )
      .take(10)

    return projects
  },
})

export const getByName = query({
  args: {
    name: v.string(),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const userId = args.userId || (await getAuthUserId(ctx))
    if (!userId) return null

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return projects.find((p) => p.name === args.name) || null
  },
})
