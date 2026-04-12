import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId } from './lib/auth'
import { requireProjectRole } from './lib/projectAccess'

const projectRoleValidator = v.union(
  v.literal('owner'),
  v.literal('editor'),
  v.literal('viewer'),
)

export const listProjectMembers = query({
  args: {
    projectId: v.id('projects'),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      userId: v.string(),
      role: projectRoleValidator,
      invitedByUserId: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'viewer',
    })

    const members = await ctx.db
      .query('projectMembers')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()

    return members.map((member) => ({
      id: member._id.toString(),
      userId: member.userId.toString(),
      role: member.role,
      invitedByUserId: member.invitedByUserId?.toString(),
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    }))
  },
})

export const addProjectMember = mutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    role: projectRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx)
    if (!currentUserId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to add project members',
      })
    }

    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId: currentUserId,
      minimumRole: 'owner',
    })

    const project = await ctx.db.get(args.projectId)
    if (!project) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      })
    }

    const ownerId = project.ownerUserId ?? project.userId
    if (ownerId === args.userId) {
      return null
    }

    if (args.role === 'owner') {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Cannot add another owner',
      })
    }

    const existing = await ctx.db
      .query('projectMembers')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', args.projectId).eq('userId', args.userId),
      )
      .unique()

    const now = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        invitedByUserId: currentUserId,
        updatedAt: now,
      })
      return null
    }

    await ctx.db.insert('projectMembers', {
      projectId: args.projectId,
      userId: args.userId,
      role: args.role,
      invitedByUserId: currentUserId,
      createdAt: now,
      updatedAt: now,
    })

    return null
  },
})

export const updateProjectMemberRole = mutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
    role: projectRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx)
    if (!currentUserId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update project members',
      })
    }

    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId: currentUserId,
      minimumRole: 'owner',
    })

    if (args.role === 'owner') {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Cannot assign owner role through membership updates',
      })
    }

    const member = await ctx.db
      .query('projectMembers')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', args.projectId).eq('userId', args.userId),
      )
      .unique()

    if (!member) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Project member not found',
      })
    }

    await ctx.db.patch(member._id, {
      role: args.role,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const removeProjectMember = mutation({
  args: {
    projectId: v.id('projects'),
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx)
    if (!currentUserId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to remove project members',
      })
    }

    const { project } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId: currentUserId,
      minimumRole: 'owner',
    })

    const ownerId = project.ownerUserId ?? project.userId
    if (ownerId === args.userId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Cannot remove project owner',
      })
    }

    const member = await ctx.db
      .query('projectMembers')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', args.projectId).eq('userId', args.userId),
      )
      .unique()

    if (!member) {
      return null
    }

    await ctx.db.delete(member._id)
    return null
  },
})
