import { ConvexError } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export type ProjectRole = 'owner' | 'editor' | 'viewer'

type ProjectAccessCtx = QueryCtx | MutationCtx

const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
}

function getProjectOwnerId(project: { ownerUserId?: Id<'users'>; userId?: Id<'users'> }) {
  return project.ownerUserId ?? project.userId ?? null
}

export function canViewProject(role: ProjectRole | null | undefined) {
  return role === 'owner' || role === 'editor' || role === 'viewer'
}

export function canManageProjectSources(role: ProjectRole | null | undefined) {
  return role === 'owner'
}

export function canEditProjectArtifacts(role: ProjectRole | null | undefined) {
  return role === 'owner' || role === 'editor'
}

export async function getProjectRole(
  ctx: ProjectAccessCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'>,
): Promise<ProjectRole | null> {
  const project = await ctx.db.get(projectId)
  if (!project) {
    return null
  }

  const ownerId = getProjectOwnerId(project)
  if (ownerId === userId) {
    return 'owner'
  }

  const membership = await ctx.db
    .query('projectMembers')
    .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
    .unique()

  return membership?.role ?? null
}

export async function requireProjectRole(
  ctx: ProjectAccessCtx,
  args: {
    projectId: Id<'projects'>
    userId: Id<'users'>
    minimumRole?: ProjectRole
  },
) {
  const project = await ctx.db.get(args.projectId)
  if (!project) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Project not found',
    })
  }

  const ownerId = getProjectOwnerId(project)
  let role: ProjectRole | null = null

  if (ownerId === args.userId) {
    role = 'owner'
  } else {
    const membership = await ctx.db
      .query('projectMembers')
      .withIndex('by_project_user', (q) =>
        q.eq('projectId', args.projectId).eq('userId', args.userId),
      )
      .unique()
    role = membership?.role ?? null
  }

  if (!role) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this project',
    })
  }

  const minimumRole = args.minimumRole ?? 'viewer'
  if (ROLE_RANK[role] < ROLE_RANK[minimumRole]) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You do not have permission for this operation',
    })
  }

  return {
    project,
    role,
  }
}

export async function listAccessibleProjectIds(ctx: ProjectAccessCtx, userId: Id<'users'>) {
  const [ownedProjectsLegacy, ownedProjectsModern, memberRows] = await Promise.all([
    ctx.db
      .query('projects')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('projects')
      .withIndex('by_owner', (q) => q.eq('ownerUserId', userId))
      .collect(),
    ctx.db
      .query('projectMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ])

  const ids = new Set<Id<'projects'>>()
  for (const project of ownedProjectsLegacy) {
    ids.add(project._id)
  }
  for (const project of ownedProjectsModern) {
    ids.add(project._id)
  }
  for (const row of memberRows) {
    ids.add(row.projectId)
  }
  return Array.from(ids)
}

export async function ensureProjectOwnerMembership(
  ctx: MutationCtx,
  args: {
    project: {
      _id: Id<'projects'>
      ownerUserId?: Id<'users'>
      userId?: Id<'users'>
    }
    userId: Id<'users'>
  },
) {
  const ownerId = getProjectOwnerId(args.project)
  if (ownerId !== args.userId) {
    return
  }

  const existing = await ctx.db
    .query('projectMembers')
    .withIndex('by_project_user', (q) =>
      q.eq('projectId', args.project._id).eq('userId', args.userId),
    )
    .unique()

  if (existing) {
    if (existing.role !== 'owner') {
      await ctx.db.patch(existing._id, {
        role: 'owner',
        updatedAt: Date.now(),
      })
    }
    return
  }

  await ctx.db.insert('projectMembers', {
    projectId: args.project._id,
    userId: args.userId,
    role: 'owner',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}
