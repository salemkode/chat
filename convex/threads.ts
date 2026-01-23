import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

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

export const attachThreadToProject = mutation({
  args: {
    threadId: v.string(),
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const thread = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!thread) {
      return {
        success: false,
        error: 'Thread not found',
      }
    }

    if (thread.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

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

    const now = Date.now()

    if (thread.projectId === args.projectId) {
      return {
        success: true,
        threadId: args.threadId,
        projectId: args.projectId,
      }
    }

    await ctx.db.patch('threadMetadata', thread._id, {
      projectId: args.projectId,
    })

    await ctx.db.patch('projects', args.projectId, {
      lastActiveAt: now,
    })

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'attach_thread_to_project',
      entityId: args.threadId,
      entityType: 'thread',
      metadata: { projectId: args.projectId },
      timestamp: now,
    })

    return {
      success: true,
      threadId: args.threadId,
      projectId: args.projectId,
    }
  },
})

export const detachThreadFromProject = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const thread = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!thread) {
      return {
        success: false,
        error: 'Thread not found',
      }
    }

    if (thread.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    const oldProjectId = thread.projectId
    if (!oldProjectId) {
      return {
        success: true,
        threadId: args.threadId,
      }
    }

    const now = Date.now()

    await ctx.db.patch('threadMetadata', thread._id, {
      projectId: undefined,
    })

    await ctx.db.patch('projects', oldProjectId, {
      lastActiveAt: now,
    })

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'detach_thread_from_project',
      entityId: args.threadId,
      entityType: 'thread',
      metadata: { projectId: oldProjectId },
      timestamp: now,
    })

    return {
      success: true,
      threadId: args.threadId,
    }
  },
})

export const moveThreadToProject = mutation({
  args: {
    threadId: v.string(),
    newProjectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const thread = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!thread) {
      return {
        success: false,
        error: 'Thread not found',
      }
    }

    if (thread.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    const oldProjectId = thread.projectId
    const newProjectId = args.newProjectId

    if (oldProjectId === newProjectId) {
      return {
        success: true,
        threadId: args.threadId,
        oldProjectId,
        newProjectId,
      }
    }

    const now = Date.now()

    const newProject = await ctx.db.get('projects', newProjectId)

    if (!newProject) {
      return {
        success: false,
        error: 'Project not found',
      }
    }

    if (newProject.userId !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
      }
    }

    await ctx.db.patch('threadMetadata', thread._id, {
      projectId: newProjectId,
    })

    await ctx.db.patch('projects', newProjectId, {
      lastActiveAt: now,
    })

    if (oldProjectId) {
      await ctx.db.patch('projects', oldProjectId, {
        lastActiveAt: now,
      })
    }

    await ctx.db.insert('auditLogs', {
      userId,
      action: 'move_thread_to_project',
      entityId: args.threadId,
      entityType: 'thread',
      metadata: { oldProjectId, newProjectId },
      timestamp: now,
    })

    return {
      success: true,
      threadId: args.threadId,
      oldProjectId,
      newProjectId,
    }
  },
})

export const createThreadInProject = mutation({
  args: {
    threadId: v.string(),
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

    const now = Date.now()

    await ctx.db.insert('threadMetadata', {
      userId,
      threadId: args.threadId,
      emoji: '💬',
      title: 'New conversation',
      mode: 'think',
      createdAt: now,
      lastActiveAt: now,
      projectId: args.projectId,
      metadata: {
        messageCount: 0,
        isPinned: false,
      },
    })

    await ctx.db.patch('projects', args.projectId, {
      lastActiveAt: now,
    })

    return {
      success: true,
      threadId: args.threadId,
      projectId: args.projectId,
      title: 'New conversation',
    }
  },
})
