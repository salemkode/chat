import {
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
} from './_generated/server'
import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { v, ConvexError } from 'convex/values'
import { getAuthUserId } from './lib/auth'

async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    return null
  }
  return userId
}

async function getOwnedProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'> | null,
) {
  if (!userId) return null
  const project = await ctx.db.get(projectId)
  if (!project || project.userId !== userId) {
    return null
  }
  return project
}

async function getOwnedThreadMetadata(
  ctx: MutationCtx,
  threadId: string,
  userId: Id<'users'> | null,
) {
  if (!userId) return null
  const metadata = await ctx.db
    .query('threadMetadata')
    .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
    .first()

  if (!metadata || metadata.userId !== userId) {
    return null
  }

  return metadata
}

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) return null

    const now = Date.now()
    const name = args.name.trim()

    if (!name) {
      return null
    }

    const id = await ctx.db.insert('projects', {
      name,
      description: args.description?.trim() || undefined,
      userId,
      threadIds: [],
      createdAt: now,
      updatedAt: now,
    })

    return { id: id.toString() }
  },
})

export const listProjects = query({
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    if (!userId) return []

    const [projects, metadata] = await Promise.all([
      ctx.db
        .query('projects')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .order('desc')
        .collect(),
      ctx.db
        .query('threadMetadata')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
    ])

    const counts = new Map<string, number>()
    for (const item of metadata) {
      if (!item.projectId) continue
      counts.set(
        item.projectId.toString(),
        (counts.get(item.projectId.toString()) ?? 0) + 1,
      )
    }

    return projects.map((project) => ({
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      threadCount: counts.get(project._id.toString()) ?? 0,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }))
  },
})

export const updateProject = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) return null

    const project = await getOwnedProject(ctx, args.projectId, userId)
    if (!project) return null

    const patch: {
      name?: string
      description?: string
      updatedAt: number
    } = {
      updatedAt: Date.now(),
    }

    if (args.name !== undefined) {
      const name = args.name.trim()
      if (!name) {
        return null
      }
      patch.name = name
    }

    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined
    }

    await ctx.db.patch(project._id, patch)
    return null
  },
})

export const deleteProject = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) return null

    const project = await getOwnedProject(ctx, args.projectId, userId)
    if (!project) return null

    const [projectMemories, linkedThreads] = await Promise.all([
      ctx.db
        .query('projectMemories')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect(),
      ctx.db
        .query('threadMetadata')
        .withIndex('by_projectId', (q) => q.eq('projectId', project._id))
        .collect(),
    ])

    for (const memory of projectMemories) {
      await ctx.db.delete(memory._id)
    }

    for (const metadata of linkedThreads) {
      if (metadata.userId !== userId) continue
      await ctx.db.patch(metadata._id, { projectId: undefined })
    }

    await ctx.db.delete(project._id)
    return null
  },
})

export const assignThreadToProject = mutation({
  args: {
    threadId: v.string(),
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) return null

    const [metadata, project] = await Promise.all([
      getOwnedThreadMetadata(ctx, args.threadId, userId),
      getOwnedProject(ctx, args.projectId, userId),
    ])

    if (!metadata || !project) return null

    const now = Date.now()
    const previousProjectId = metadata.projectId

    await ctx.db.patch(metadata._id, {
      projectId: project._id,
    })

    await ctx.db.patch(project._id, {
      updatedAt: now,
    })

    if (previousProjectId && previousProjectId !== project._id) {
      const previousProject = await ctx.db.get(previousProjectId)
      if (previousProject?.userId === userId) {
        await ctx.db.patch(previousProject._id, {
          updatedAt: now,
        })
      }
    }

    return null
  },
})

export const removeThreadFromProject = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) return null

    const metadata = await getOwnedThreadMetadata(ctx, args.threadId, userId)
    if (!metadata) return null

    const projectId = metadata.projectId

    await ctx.db.patch(metadata._id, {
      projectId: undefined,
    })

    if (projectId) {
      const project = await ctx.db.get(projectId)
      if (project?.userId === userId) {
        await ctx.db.patch(project._id, {
          updatedAt: Date.now(),
        })
      }
    }

    return null
  },
})

export const getProjectForThread = query({
  args: {
    threadId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId))
      .first()

    if (!metadata || metadata.userId !== userId || !metadata.projectId) {
      return null
    }

    const project = await ctx.db.get(metadata.projectId)
    if (!project || project.userId !== userId) {
      return null
    }

    return {
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }
  },
})

export const listThreadsByProject = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) return []

    const project = await getOwnedProject(ctx, args.projectId, userId)
    if (!project) return []

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
      .collect()

    const ownedMetadata = metadata.filter((item) => item.userId === userId)

    const threads = await Promise.all(
      ownedMetadata.map(async (item) => {
        const thread = await ctx.runQuery(components.agent.threads.getThread, {
          threadId: item.threadId,
        })
        if (!thread || thread.userId !== userId) {
          return null
        }

        return {
          ...thread,
          metadata: item,
        }
      }),
    )

    return threads
      .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
      .sort((left, right) => right._creationTime - left._creationTime)
  },
})

export const migrateLegacyThreadProjectAssignments = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    if (!userId) return { migrated: 0, conflicts: 0 }

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const preferredProjectByThreadId = new Map<string, Id<'projects'>>()
    let conflicts = 0

    for (const project of projects) {
      for (const threadId of project.threadIds ?? []) {
        const existingProjectId = preferredProjectByThreadId.get(threadId)
        if (!existingProjectId) {
          preferredProjectByThreadId.set(threadId, project._id)
          continue
        }

        const existingProject = await ctx.db.get(existingProjectId)
        if (!existingProject || project.updatedAt > existingProject.updatedAt) {
          preferredProjectByThreadId.set(threadId, project._id)
        }
        conflicts += 1
      }
    }

    let migrated = 0
    for (const [threadId, projectId] of preferredProjectByThreadId) {
      const metadata = await ctx.db
        .query('threadMetadata')
        .withIndex('by_threadId', (q) => q.eq('threadId', threadId))
        .first()

      if (!metadata || metadata.userId !== userId || metadata.projectId) {
        continue
      }

      await ctx.db.patch(metadata._id, {
        projectId,
      })
      migrated += 1
    }

    return { migrated, conflicts }
  },
})
