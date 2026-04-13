import {
  query,
  mutation,
  action,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
} from './_generated/server'
import { components, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { v, ConvexError } from 'convex/values'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getAuthUserId } from './lib/auth'
import { extractMessageText } from './functions/memoryShared'
import {
  ensureProjectOwnerMembership,
  listAccessibleProjectIds,
  requireProjectRole,
} from './lib/projectAccess'

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    return null
  }
  return userId
}

async function getAccessibleProject(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>,
  userId: Id<'users'> | null,
  minimumRole: 'owner' | 'editor' | 'viewer' = 'viewer',
) {
  if (!userId) return null
  try {
    return await requireProjectRole(ctx, {
      projectId,
      userId,
      minimumRole,
    })
  } catch {
    return null
  }
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

const PROJECT_NAME_MAX_LENGTH = 60
const PROJECT_DESCRIPTION_MAX_LENGTH = 280
const PROJECT_SUGGESTION_DEFAULT_MODEL = 'openai/gpt-4.1-mini'

const projectSuggestionSchema = z.object({
  name: z.string().min(1).max(PROJECT_NAME_MAX_LENGTH),
  description: z.string().max(PROJECT_DESCRIPTION_MAX_LENGTH).optional(),
})

const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  : null

function summarizeLine(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

function normalizeProjectName(name: string) {
  const normalized = name.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return ''
  }
  return normalized.slice(0, PROJECT_NAME_MAX_LENGTH).trim()
}

function normalizeProjectDescription(description?: string) {
  const normalized = description?.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return undefined
  }
  return normalized.slice(0, PROJECT_DESCRIPTION_MAX_LENGTH).trim()
}

function fallbackProjectNameFromMentionQuery(query: string): string {
  const normalized = query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^new\s*[:-]?\s*/i, '')
    .trim()

  if (!normalized) {
    return 'New Project'
  }

  return normalized.slice(0, PROJECT_NAME_MAX_LENGTH)
}

function fallbackSuggestion(args: { mentionQuery?: string; draft: string; reason: string }) {
  const normalizedDraft = args.draft.replace(/\s+/g, ' ').trim()
  const description = normalizedDraft ? summarizeLine(normalizedDraft, 160) : undefined
  return {
    name: normalizeProjectName(fallbackProjectNameFromMentionQuery(args.mentionQuery ?? '')),
    description: normalizeProjectDescription(description),
    source: 'fallback' as const,
    reason: args.reason,
  }
}

export const getProjectSuggestionContext = internalQuery({
  args: {
    threadId: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id('users'),
    threadTitle: v.optional(v.string()),
    recentTranscript: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to suggest a project',
      })
    }

    if (!args.threadId) {
      return {
        userId,
        threadTitle: undefined,
        recentTranscript: undefined,
      }
    }

    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', args.threadId!))
      .first()

    if (!metadata || metadata.userId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Thread not found',
      })
    }

    const [thread, recentMessages] = await Promise.all([
      ctx.runQuery(components.agent.threads.getThread, {
        threadId: args.threadId,
      }),
      ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
        threadId: args.threadId,
        statuses: ['success'],
        excludeToolMessages: true,
        order: 'desc',
        paginationOpts: {
          cursor: null,
          numItems: 12,
        },
      }),
    ])

    const recentTranscript = recentMessages.page
      .map((message) => {
        const role = message.message?.role
        if (role !== 'user' && role !== 'assistant') {
          return null
        }
        const text = extractMessageText(message)
        if (!text) {
          return null
        }
        return `${role}: ${summarizeLine(text, 180)}`
      })
      .filter((line): line is string => line !== null)
      .reverse()
      .join('\n')

    return {
      userId,
      threadTitle: thread?.title,
      recentTranscript: recentTranscript || undefined,
    }
  },
})

export const resolveProjectSuggestionModel = internalQuery({
  args: {
    modelId: v.optional(v.id('models')),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!args.modelId) {
      return PROJECT_SUGGESTION_DEFAULT_MODEL
    }

    const model = await ctx.db.get(args.modelId)
    if (!model) {
      return PROJECT_SUGGESTION_DEFAULT_MODEL
    }

    return model.modelId || PROJECT_SUGGESTION_DEFAULT_MODEL
  },
})

export const suggestProjectFromContext = action({
  args: {
    threadId: v.optional(v.string()),
    draft: v.string(),
    modelId: v.optional(v.id('models')),
    mentionQuery: v.optional(v.string()),
  },
  returns: v.object({
    name: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal('ai'), v.literal('fallback')),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx: ActionCtx, args) => {
    const suggestionContext = await ctx.runQuery(internal.projects.getProjectSuggestionContext, {
      threadId: args.threadId,
    })

    const mentionQuery = args.mentionQuery?.trim() || ''
    const normalizedDraft = args.draft.replace(/\s+/g, ' ').trim()

    if (!openrouter) {
      return fallbackSuggestion({
        mentionQuery,
        draft: normalizedDraft,
        reason: 'OPENROUTER_API_KEY is not configured.',
      })
    }

    const modelId = await ctx.runQuery(internal.projects.resolveProjectSuggestionModel, {
      modelId: args.modelId,
    })

    const prompt = [
      'Suggest a concise project name and optional description for this chat context.',
      'Return JSON-safe content through the schema only.',
      'Project name: 2-6 words, max 60 chars. Description: optional, max 160 chars.',
      'Avoid quotes, emojis, and generic names when context is specific.',
      mentionQuery ? `Mention query: ${mentionQuery}` : '',
      normalizedDraft ? `Current draft: ${normalizedDraft}` : '',
      suggestionContext.threadTitle ? `Current thread title: ${suggestionContext.threadTitle}` : '',
      suggestionContext.recentTranscript
        ? `Recent thread transcript:\n${suggestionContext.recentTranscript}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    try {
      const result = await generateObject({
        model: openrouter.chat(modelId),
        schema: projectSuggestionSchema,
        temperature: 0.2,
        prompt,
      })

      const name = normalizeProjectName(result.object.name)
      if (!name) {
        return fallbackSuggestion({
          mentionQuery,
          draft: normalizedDraft,
          reason: 'AI suggestion returned an empty project name.',
        })
      }

      return {
        name,
        description: normalizeProjectDescription(result.object.description),
        source: 'ai' as const,
        reason: undefined,
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'AI suggestion failed.'
      return fallbackSuggestion({
        mentionQuery,
        draft: normalizedDraft,
        reason,
      })
    }
  },
})

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
      ownerUserId: userId,
      userId,
      visibility: 'private',
      threadIds: [],
      createdAt: now,
      updatedAt: now,
    })

    const createdProject = await ctx.db.get(id)
    if (createdProject) {
      await ensureProjectOwnerMembership(ctx, {
        project: createdProject,
        userId,
      })
    }

    return { id: id.toString() }
  },
})

export const listProjects = query({
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    if (!userId) return []

    const [projectIds, metadata] = await Promise.all([
      listAccessibleProjectIds(ctx, userId),
      ctx.db
        .query('threadMetadata')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
    ])
    const projects = (await Promise.all(projectIds.map((projectId) => ctx.db.get(projectId))))
      .filter((project): project is NonNullable<typeof project> => project !== null)
      .sort((left, right) => right.updatedAt - left.updatedAt)

    const counts = new Map<string, number>()
    for (const item of metadata) {
      if (!item.projectId) continue
      counts.set(item.projectId.toString(), (counts.get(item.projectId.toString()) ?? 0) + 1)
    }

    return await Promise.all(
      projects.map(async (project) => {
        const role = await getAccessibleProject(ctx, project._id, userId, 'viewer')
        return {
          id: project._id.toString(),
          name: project.name,
          description: project.description,
          visibility: project.visibility ?? 'private',
          role: role?.role ?? 'viewer',
          threadCount: counts.get(project._id.toString()) ?? 0,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }
      }),
    )
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

    const projectAccess = await getAccessibleProject(ctx, args.projectId, userId, 'owner')
    if (!projectAccess) return null
    const project = projectAccess.project

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

    const projectAccess = await getAccessibleProject(ctx, args.projectId, userId, 'owner')
    if (!projectAccess) return null
    const project = projectAccess.project

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
      getAccessibleProject(ctx, args.projectId, userId, 'viewer'),
    ])

    if (!metadata || !project) return null
    const projectDoc = project.project

    const now = Date.now()
    const previousProjectId = metadata.projectId

    await ctx.db.patch(metadata._id, {
      projectId: projectDoc._id,
    })

    await ctx.db.patch(projectDoc._id, {
      updatedAt: now,
    })

    if (previousProjectId && previousProjectId !== projectDoc._id) {
      const previousProject = await ctx.db.get(previousProjectId)
      const previousProjectAccess = previousProject
        ? await getAccessibleProject(ctx, previousProject._id, userId, 'viewer')
        : null
      if (previousProjectAccess) {
        await ctx.db.patch(previousProjectAccess.project._id, {
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
      const project = await getAccessibleProject(ctx, projectId, userId, 'viewer')
      if (project) {
        await ctx.db.patch(project.project._id, {
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

    const project = await getAccessibleProject(ctx, metadata.projectId, userId, 'viewer')
    if (!project) {
      return null
    }

    return {
      id: project.project._id.toString(),
      name: project.project.name,
      description: project.project.description,
      createdAt: project.project.createdAt,
      updatedAt: project.project.updatedAt,
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

    const project = await getAccessibleProject(ctx, args.projectId, userId, 'viewer')
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

    const projectIds = await listAccessibleProjectIds(ctx, userId)
    const projects = (
      await Promise.all(projectIds.map((projectId) => ctx.db.get(projectId)))
    ).filter((project): project is NonNullable<typeof project> => project !== null)

    const preferredProjectByThreadId = new Map<string, Id<'projects'>>()
    let conflicts = 0

    for (const project of projects) {
      await ensureProjectOwnerMembership(ctx, {
        project,
        userId: project.ownerUserId ?? project.userId ?? userId,
      })
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

export const migrateProjectOwnership = mutation({
  args: {},
  returns: v.object({
    updatedProjects: v.number(),
    ensuredMemberships: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    if (!userId) {
      return {
        updatedProjects: 0,
        ensuredMemberships: 0,
      }
    }

    const projectIds = await listAccessibleProjectIds(ctx, userId)
    const projects = (
      await Promise.all(projectIds.map((projectId) => ctx.db.get(projectId)))
    ).filter((project): project is NonNullable<typeof project> => project !== null)

    let updatedProjects = 0
    let ensuredMemberships = 0
    for (const project of projects) {
      const ownerUserId = project.ownerUserId ?? project.userId
      if (!ownerUserId) {
        continue
      }

      const needsProjectPatch =
        project.ownerUserId === undefined ||
        project.userId === undefined ||
        project.visibility === undefined

      if (needsProjectPatch) {
        await ctx.db.patch(project._id, {
          ownerUserId,
          userId: project.userId ?? ownerUserId,
          visibility: project.visibility ?? 'private',
          updatedAt: Date.now(),
        })
        updatedProjects += 1
      }

      await ensureProjectOwnerMembership(ctx, {
        project: {
          ...project,
          ownerUserId,
        },
        userId: ownerUserId,
      })
      ensuredMemberships += 1
    }

    return {
      updatedProjects,
      ensuredMemberships,
    }
  },
})
