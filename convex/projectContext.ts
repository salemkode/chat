import { ConvexError, v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
  mutation,
  query,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { getAuthUserId } from './lib/auth'
import {
  canEditProjectArtifacts,
  canManageProjectSources,
  requireProjectRole,
} from './lib/projectAccess'

const sourceProviderValidator = v.union(
  v.literal('github'),
  v.literal('gmail'),
  v.literal('manual'),
)

const sourceKindValidator = v.union(
  v.literal('github_repo'),
  v.literal('gmail_query'),
  v.literal('manual_uploads'),
  v.literal('manual_links'),
)

const artifactKindValidator = v.union(
  v.literal('repo_file'),
  v.literal('pull_request'),
  v.literal('issue'),
  v.literal('commit'),
  v.literal('email_thread'),
  v.literal('email_message'),
  v.literal('email_attachment'),
  v.literal('uploaded_file'),
  v.literal('external_link'),
)

const sourceStatusValidator = v.union(v.literal('active'), v.literal('paused'), v.literal('error'))

const artifactStatusValidator = v.union(
  v.literal('active'),
  v.literal('archived'),
  v.literal('error'),
)

const extractionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('ready'),
  v.literal('error'),
)

type SourceDoc = Doc<'projectSources'>

function parseJsonOrNull(value?: string) {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function toSourceListItem(source: Doc<'projectSources'>) {
  return {
    id: source._id.toString(),
    projectId: source.projectId.toString(),
    provider: source.provider,
    kind: source.kind,
    title: source.title,
    status: source.status,
    syncMode: source.syncMode,
    config: parseJsonOrNull(source.configJson),
    connectionId: source.connectionId?.toString(),
    lastSyncedAt: source.lastSyncedAt,
    lastError: source.lastError,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to manage project context',
    })
  }
  return userId
}

async function ensureManualSource(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>
    userId: Id<'users'>
    kind: 'manual_uploads' | 'manual_links'
  },
) {
  const existing = await ctx.db
    .query('projectSources')
    .withIndex('by_project_provider', (q) =>
      q.eq('projectId', args.projectId).eq('provider', 'manual'),
    )
    .collect()

  const match = existing.find((source) => source.kind === args.kind)
  if (match) {
    return match
  }

  const now = Date.now()
  const id = await ctx.db.insert('projectSources', {
    projectId: args.projectId,
    createdByUserId: args.userId,
    provider: 'manual',
    kind: args.kind,
    title: args.kind === 'manual_links' ? 'Manual Links' : 'Manual Uploads',
    status: 'active',
    syncMode: 'manual',
    configJson: JSON.stringify({}),
    createdAt: now,
    updatedAt: now,
  })
  const source = await ctx.db.get(id)
  if (!source) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Failed to create project source',
    })
  }
  return source
}

async function enqueueSyncJob(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>
    sourceId: Id<'projectSources'>
    jobType: 'full' | 'incremental' | 'artifact_refresh'
  },
) {
  const jobId = await ctx.db.insert('projectSyncJobs', {
    projectId: args.projectId,
    sourceId: args.sourceId,
    jobType: args.jobType,
    status: 'queued',
    scheduledAt: Date.now(),
  })

  await ctx.scheduler.runAfter(0, internal.functions.projectSync.runSyncJob, {
    jobId,
  })

  return jobId
}

export const getProjectWorkspace = query({
  args: {
    projectId: v.id('projects'),
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      visibility: v.union(v.literal('private'), v.literal('shared')),
      role: v.union(v.literal('owner'), v.literal('editor'), v.literal('viewer')),
      createdAt: v.number(),
      updatedAt: v.number(),
      counts: v.object({
        chats: v.number(),
        sources: v.number(),
        artifacts: v.number(),
        members: v.number(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { project, role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'viewer',
    })

    const [threads, sources, artifacts, members] = await Promise.all([
      ctx.db
        .query('threadMetadata')
        .withIndex('by_projectId', (q) => q.eq('projectId', args.projectId))
        .collect(),
      ctx.db
        .query('projectSources')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
      ctx.db
        .query('projectArtifacts')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
      ctx.db
        .query('projectMembers')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .collect(),
    ])

    return {
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      visibility: project.visibility ?? 'private',
      role,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      counts: {
        chats: threads.length,
        sources: sources.length,
        artifacts: artifacts.length,
        members: Math.max(members.length, 1),
      },
    }
  },
})

export const listProjectSources = query({
  args: {
    projectId: v.id('projects'),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      projectId: v.string(),
      provider: sourceProviderValidator,
      kind: sourceKindValidator,
      title: v.string(),
      status: sourceStatusValidator,
      syncMode: v.union(v.literal('rule'), v.literal('manual')),
      config: v.any(),
      connectionId: v.optional(v.string()),
      lastSyncedAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'viewer',
    })

    const sources = await ctx.db
      .query('projectSources')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()

    return sources.map(toSourceListItem)
  },
})

export const createGithubRepoSource = mutation({
  args: {
    projectId: v.id('projects'),
    connectionId: v.id('integrationConnections'),
    config: v.object({
      owner: v.string(),
      repo: v.string(),
      defaultBranch: v.optional(v.string()),
      includePullRequests: v.boolean(),
      includeIssues: v.boolean(),
      includePathGlobs: v.array(v.string()),
      recentDays: v.optional(v.number()),
    }),
  },
  returns: v.object({ sourceId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'owner',
    })
    if (!canManageProjectSources(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only owners can manage connector-backed sources',
      })
    }

    const connection = await ctx.db.get(args.connectionId)
    if (!connection || connection.ownerUserId !== userId || connection.provider !== 'github') {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'GitHub connection not found',
      })
    }

    const now = Date.now()
    const sourceId = await ctx.db.insert('projectSources', {
      projectId: args.projectId,
      createdByUserId: userId,
      connectionId: connection._id,
      provider: 'github',
      kind: 'github_repo',
      title: `${args.config.owner}/${args.config.repo}`,
      status: 'active',
      syncMode: 'rule',
      configJson: JSON.stringify(args.config),
      createdAt: now,
      updatedAt: now,
    })

    await enqueueSyncJob(ctx, {
      projectId: args.projectId,
      sourceId,
      jobType: 'full',
    })

    return { sourceId: sourceId.toString() }
  },
})

export const createGmailQuerySource = mutation({
  args: {
    projectId: v.id('projects'),
    connectionId: v.id('integrationConnections'),
    config: v.object({
      query: v.string(),
      maxThreads: v.optional(v.number()),
      includeBody: v.optional(v.boolean()),
    }),
  },
  returns: v.object({ sourceId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'owner',
    })
    if (!canManageProjectSources(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only owners can manage connector-backed sources',
      })
    }

    const connection = await ctx.db.get(args.connectionId)
    if (!connection || connection.ownerUserId !== userId || connection.provider !== 'google') {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Google connection not found',
      })
    }

    const now = Date.now()
    const sourceId = await ctx.db.insert('projectSources', {
      projectId: args.projectId,
      createdByUserId: userId,
      connectionId: connection._id,
      provider: 'gmail',
      kind: 'gmail_query',
      title: args.config.query.trim() || 'Gmail Source',
      status: 'active',
      syncMode: 'rule',
      configJson: JSON.stringify(args.config),
      createdAt: now,
      updatedAt: now,
    })

    await enqueueSyncJob(ctx, {
      projectId: args.projectId,
      sourceId,
      jobType: 'full',
    })

    return { sourceId: sourceId.toString() }
  },
})

export const createManualLinkArtifact = mutation({
  args: {
    projectId: v.id('projects'),
    url: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({ artifactId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'editor',
    })
    if (!canEditProjectArtifacts(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You cannot add artifacts to this project',
      })
    }

    const source = await ensureManualSource(ctx, {
      projectId: args.projectId,
      userId,
      kind: 'manual_links',
    })

    const now = Date.now()
    const normalizedUrl = args.url.trim()
    if (!normalizedUrl) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'URL cannot be empty',
      })
    }

    const externalId = normalizedUrl.toLowerCase()
    const existing = await ctx.db
      .query('projectArtifacts')
      .withIndex('by_source_external', (q) =>
        q.eq('sourceId', source._id).eq('externalId', externalId),
      )
      .unique()

    const artifactId =
      existing?._id ??
      (await ctx.db.insert('projectArtifacts', {
        projectId: args.projectId,
        sourceId: source._id,
        createdByUserId: userId,
        provider: 'manual',
        kind: 'external_link',
        externalId,
        title: args.title?.trim() || normalizedUrl,
        subtitle: undefined,
        url: normalizedUrl,
        mimeType: undefined,
        parentArtifactId: undefined,
        includeInContext: true,
        pinned: false,
        selectionOrigin: 'manual',
        status: 'active',
        metadataJson: undefined,
        firstSeenAt: now,
        lastSyncedAt: undefined,
        updatedAt: now,
      }))

    await enqueueSyncJob(ctx, {
      projectId: args.projectId,
      sourceId: source._id,
      jobType: 'artifact_refresh',
    })

    return { artifactId: artifactId.toString() }
  },
})

export const generateProjectUploadUrl = mutation({
  args: {
    projectId: v.id('projects'),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'editor',
    })
    if (!canEditProjectArtifacts(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You cannot upload files to this project',
      })
    }

    return await ctx.storage.generateUploadUrl()
  },
})

export const createUploadedArtifact = mutation({
  args: {
    projectId: v.id('projects'),
    storageId: v.id('_storage'),
    filename: v.string(),
    mediaType: v.optional(v.string()),
  },
  returns: v.object({ artifactId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'editor',
    })
    if (!canEditProjectArtifacts(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You cannot add uploaded artifacts to this project',
      })
    }

    const source = await ensureManualSource(ctx, {
      projectId: args.projectId,
      userId,
      kind: 'manual_uploads',
    })

    const now = Date.now()
    const artifactId = await ctx.db.insert('projectArtifacts', {
      projectId: args.projectId,
      sourceId: source._id,
      createdByUserId: userId,
      provider: 'manual',
      kind: 'uploaded_file',
      externalId: `${args.storageId}:${args.filename}`,
      title: args.filename.trim() || 'Uploaded file',
      subtitle: undefined,
      url: undefined,
      mimeType: args.mediaType,
      storageId: args.storageId,
      parentArtifactId: undefined,
      includeInContext: true,
      pinned: false,
      selectionOrigin: 'manual',
      status: 'active',
      metadataJson: undefined,
      firstSeenAt: now,
      lastSyncedAt: undefined,
      updatedAt: now,
    })

    await ctx.db.insert('projectArtifactContents', {
      artifactId,
      projectId: args.projectId,
      text: '',
      contentHash: '',
      extractionStatus: 'pending',
      error: undefined,
      updatedAt: now,
    })

    return { artifactId: artifactId.toString() }
  },
})

export const listProjectArtifacts = query({
  args: {
    projectId: v.id('projects'),
    kind: v.optional(artifactKindValidator),
    provider: v.optional(sourceProviderValidator),
    includeInContext: v.optional(v.boolean()),
    pinned: v.optional(v.boolean()),
    query: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      sourceId: v.string(),
      projectId: v.string(),
      provider: sourceProviderValidator,
      kind: artifactKindValidator,
      title: v.string(),
      subtitle: v.optional(v.string()),
      url: v.optional(v.string()),
      mimeType: v.optional(v.string()),
      includeInContext: v.boolean(),
      pinned: v.boolean(),
      status: artifactStatusValidator,
      metadata: v.any(),
      extractionStatus: v.optional(extractionStatusValidator),
      extractionError: v.optional(v.string()),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'viewer',
    })

    const items = await ctx.db
      .query('projectArtifacts')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()
    const contentRows = await ctx.db
      .query('projectArtifactContents')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
    const contentByArtifactId = new Map(contentRows.map((row) => [row.artifactId.toString(), row]))

    const needle = args.query?.trim().toLowerCase()
    return items
      .filter((item) => {
        if (args.kind && item.kind !== args.kind) {
          return false
        }
        if (args.provider && item.provider !== args.provider) {
          return false
        }
        if (
          args.includeInContext !== undefined &&
          item.includeInContext !== args.includeInContext
        ) {
          return false
        }
        if (args.pinned !== undefined && item.pinned !== args.pinned) {
          return false
        }
        if (needle) {
          return `${item.title}\n${item.subtitle ?? ''}\n${item.url ?? ''}`
            .toLowerCase()
            .includes(needle)
        }
        return true
      })
      .map((item) => {
        const content = contentByArtifactId.get(item._id.toString())
        return {
          id: item._id.toString(),
          sourceId: item.sourceId.toString(),
          projectId: item.projectId.toString(),
          provider: item.provider,
          kind: item.kind,
          title: item.title,
          subtitle: item.subtitle,
          url: item.url,
          mimeType: item.mimeType,
          includeInContext: item.includeInContext,
          pinned: item.pinned,
          status: item.status,
          metadata: parseJsonOrNull(item.metadataJson),
          extractionStatus: content?.extractionStatus,
          extractionError: content?.error,
          updatedAt: item.updatedAt,
        }
      })
  },
})

export const updateProjectArtifact = mutation({
  args: {
    projectId: v.id('projects'),
    artifactId: v.id('projectArtifacts'),
    includeInContext: v.optional(v.boolean()),
    pinned: v.optional(v.boolean()),
    title: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'editor',
    })
    if (!canEditProjectArtifacts(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You cannot edit artifacts in this project',
      })
    }

    const artifact = await ctx.db.get(args.artifactId)
    if (!artifact || artifact.projectId !== args.projectId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Artifact not found',
      })
    }

    await ctx.db.patch(artifact._id, {
      ...(args.includeInContext !== undefined ? { includeInContext: args.includeInContext } : {}),
      ...(args.pinned !== undefined ? { pinned: args.pinned } : {}),
      ...(args.title !== undefined ? { title: args.title.trim() || artifact.title } : {}),
      updatedAt: Date.now(),
    })

    return null
  },
})

export const syncProjectSourceNow = mutation({
  args: {
    projectId: v.id('projects'),
    sourceId: v.id('projectSources'),
  },
  returns: v.object({ jobId: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireAuthenticatedUser(ctx)
    const { role } = await requireProjectRole(ctx, {
      projectId: args.projectId,
      userId,
      minimumRole: 'owner',
    })
    if (!canManageProjectSources(role)) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only project owners can sync connector sources',
      })
    }

    const source = await ctx.db.get(args.sourceId)
    if (!source || source.projectId !== args.projectId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Source not found',
      })
    }

    const jobId = await enqueueSyncJob(ctx, {
      projectId: args.projectId,
      sourceId: args.sourceId,
      jobType: 'incremental',
    })

    return {
      jobId: jobId.toString(),
    }
  },
})

export const getProjectSourceInternal = internalQuery({
  args: {
    sourceId: v.id('projectSources'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('projectSources'),
      projectId: v.id('projects'),
      kind: sourceKindValidator,
      provider: sourceProviderValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      return null
    }
    return {
      _id: source._id,
      projectId: source.projectId,
      kind: source.kind,
      provider: source.provider,
    }
  },
})

export const touchProjectSourceInternal = internalMutation({
  args: {
    sourceId: v.id('projectSources'),
    clearError: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      return null
    }
    await ctx.db.patch(source._id, {
      lastSyncedAt: Date.now(),
      updatedAt: Date.now(),
      ...(args.clearError ? { lastError: undefined } : {}),
    })
    return null
  },
})

export const listArtifactsByProjectInternal = internalQuery({
  args: {
    projectId: v.id('projects'),
  },
  returns: v.array(
    v.object({
      _id: v.id('projectArtifacts'),
      sourceId: v.id('projectSources'),
      kind: artifactKindValidator,
      url: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const artifacts = await ctx.db
      .query('projectArtifacts')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()

    return artifacts.map((artifact) => ({
      _id: artifact._id,
      sourceId: artifact.sourceId,
      kind: artifact.kind,
      url: artifact.url,
    }))
  },
})

export const upsertProjectArtifactContentInternal = internalMutation({
  args: {
    artifactId: v.id('projectArtifacts'),
    projectId: v.id('projects'),
    text: v.string(),
    contentHash: v.string(),
    extractionStatus: extractionStatusValidator,
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('projectArtifactContents')
      .withIndex('by_artifact', (q) => q.eq('artifactId', args.artifactId))
      .unique()

    const patch = {
      projectId: args.projectId,
      text: args.text,
      contentHash: args.contentHash,
      extractionStatus: args.extractionStatus,
      error: args.error,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
      return null
    }

    await ctx.db.insert('projectArtifactContents', {
      artifactId: args.artifactId,
      ...patch,
    })
    return null
  },
})
