
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

export const updateLastActiveAt = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Unauthorized')

    const project = await ctx.db.get(args.projectId)

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

    await ctx.db.patch(args.projectId, {
      lastActiveAt: Date.now(),
    })

    return {
      success: true,
    },
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

    const thread = await ctx.runQuery(api.threadMetadata.get, {
      threadId: args.threadId,
    })

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

    const project = await ctx.db.get(args.projectId)

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

    await ctx.db.patch(thread._id, {
      projectId: args.projectId,
    })

    await ctx.db.patch(args.projectId, {
      lastActiveAt: now,
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

    const thread = await ctx.runQuery(api.threadMetadata.get, {
      threadId: args.threadId,
    })

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

    const now = Date.now()

    await ctx.db.patch(thread._id, {
      projectId: undefined,
    })

    await ctx.runMutation(api.projects.updateLastActiveAt, {
      projectId: oldProjectId,
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

    const thread = await ctx.runQuery(api.threadMetadata.get, {
      threadId: args.threadId,
    })

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

    const now = Date.now()

    const newProject = await ctx.db.get(newProjectId)

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

    await ctx.db.patch(thread._id, {
      projectId: newProjectId,
    })

    await ctx.db.patch(newProjectId, {
      lastActiveAt: now,
    })

    return {
      success: true,
      threadId: args.threadId,
      oldProjectId,
      newProjectId,
    }
  },
})
