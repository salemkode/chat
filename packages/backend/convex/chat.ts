import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from './lib/auth'
import { components } from './_generated/api'
import { paginationOptsValidator, type FunctionArgs } from 'convex/server'
import {
  listMessages as listAgentMessages,
  syncStreams,
  toUIMessages,
  vStreamArgs,
} from '@convex-dev/agent'
import { ConvexError } from 'convex/values'
import { threadMetadataValidator } from './lib/validators'
import { GENERATION_STOPPED_BY_USER } from './agents'
import { canViewProject, getProjectRole } from './lib/projectAccess'

type AgentThreadId = FunctionArgs<typeof components.agent.threads.getThread>['threadId']

const threadDetailValidator = v.union(
  v.null(),
  v.object({
    _id: v.string(),
    _creationTime: v.number(),
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
    metadata: v.union(v.null(), threadMetadataValidator),
    project: v.union(
      v.null(),
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
      }),
    ),
  }),
)

function isInvalidThreadIdError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message
  return (
    message.includes('does not match the table name in validator') ||
    (message.includes('Value does not match validator') &&
      message.includes('Validator: v.id("threads")'))
  )
}

function emptyMessagesPage() {
  return { page: [], isDone: true, continueCursor: '', streams: [] }
}

export const listThreads = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    // Return empty list if not authenticated to prevent errors during load
    if (!userId) return { page: [], isDone: true, continueCursor: '' }

    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      paginationOpts: args.paginationOpts,
    })
  },
})

export const deleteThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    let thread
    try {
      thread = await ctx.runQuery(components.agent.threads.getThread, {
        threadId: args.threadId as AgentThreadId,
      })
    } catch (error) {
      if (isInvalidThreadIdError(error)) {
        return null
      }
      return null
    }

    if (!thread || thread.userId !== userId) {
      return null
    }

    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
      threadId: thread._id,
    })
    return null
  },
})

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return emptyMessagesPage()
    }

    // If no threadId, return empty page structure
    if (!args.threadId) {
      return emptyMessagesPage()
    }

    let paginated: Awaited<ReturnType<typeof listAgentMessages>>
    try {
      paginated = await listAgentMessages(ctx, components.agent, args)
    } catch (error) {
      if (isInvalidThreadIdError(error)) {
        return emptyMessagesPage()
      }
      throw error
    }
    const failedErrorsByOrder = new Map<number, string>()

    for (const message of paginated.page) {
      if (message.status === 'failed' && message.error) {
        failedErrorsByOrder.set(message.order, message.error)
      }
    }

    const page = toUIMessages(paginated.page).map((message) => {
      if (message.status !== 'failed') {
        return message
      }

      const failure = buildFailureMetadata(failedErrorsByOrder.get(message.order), message.text)

      return {
        ...message,
        failureKind: failure.kind,
        failureMode: failure.mode,
        failureNote: failure.note,
      }
    })

    let streams: Awaited<ReturnType<typeof syncStreams>>
    try {
      streams = await syncStreams(ctx, components.agent, args)
    } catch (error) {
      if (isInvalidThreadIdError(error)) {
        return { ...paginated, page, streams: [] }
      }
      throw error
    }

    return { ...paginated, page, streams }
  },
})

export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return ''
    }

    const thread = await ctx.runMutation(components.agent.threads.createThread, {
      userId,
    })

    return thread._id
  },
})

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    if (!args.threadId) {
      return null
    }

    let thread
    try {
      thread = await ctx.runQuery(components.agent.threads.getThread, {
        threadId: args.threadId as AgentThreadId,
      })
    } catch (error) {
      if (isInvalidThreadIdError(error)) {
        return null
      }
      return null
    }

    if (!thread) {
      return null
    }

    // Get thread metadata
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', thread._id))
      .first()

    const project = metadata?.projectId ? await ctx.db.get(metadata.projectId) : null

    const role =
      project && metadata?.projectId ? await getProjectRole(ctx, metadata.projectId, userId) : null

    return {
      _id: thread._id,
      _creationTime: thread._creationTime,
      title: thread.title,
      userId: thread.userId,
      metadata: metadata ?? null,
      project:
        project && canViewProject(role)
          ? {
              id: project._id.toString(),
              name: project.name,
              description: project.description,
            }
          : null,
    }
  },
})

type FailureKind = 'stopped' | 'error'
type FailureMode = 'replace' | 'clarify'

function buildFailureMetadata(
  error: string | undefined,
  text: string | undefined,
): {
  kind: FailureKind
  mode: FailureMode
  note: string
} {
  const kind: FailureKind = isStoppedFailure(error) ? 'stopped' : 'error'
  const hasGeneratedContent = Boolean(text?.trim())
  const mode: FailureMode = hasGeneratedContent ? 'clarify' : 'replace'

  if (kind === 'stopped') {
    return {
      kind,
      mode,
      note: 'Generation stopped.',
    }
  }

  const cleaned = sanitizeFailedMessage(error)

  return {
    kind,
    mode,
    note: cleaned || 'This message failed to generate.',
  }
}

function isStoppedFailure(error: string | undefined) {
  if (!error) {
    return false
  }

  const normalized = error.trim().toLowerCase()
  return (
    normalized === GENERATION_STOPPED_BY_USER.toLowerCase() ||
    normalized.includes('stopped by user') ||
    normalized === 'generation stopped.'
  )
}

function sanitizeFailedMessage(error: string | undefined): string {
  if (!error) {
    return ''
  }

  const normalized = error
    .replace(/\s*\[Request ID:[^\]]+\]\s*/g, ' ')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (isRetryableProviderRateLimit(normalized)) {
    return 'The selected model is temporarily rate-limited upstream. Please try again shortly.'
  }

  const accessDeniedModel = extractAccessDeniedModel(normalized)
  if (accessDeniedModel) {
    return `Your provider account does not have access to ${accessDeniedModel}. Choose another model or upgrade that provider plan.`
  }

  return normalized
    .replace(/Last error:\s*/gi, '')
    .replace(/Provider returned error/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractAccessDeniedModel(error: string) {
  const match =
    /does not yet include access to ([^.,]+?)(?:[.!]|$)/i.exec(error) ||
    /does not include access to ([^.,]+?)(?:[.!]|$)/i.exec(error)

  return match?.[1]?.trim()
}

function isRetryableProviderRateLimit(error: string) {
  const normalized = error.toLowerCase()
  return (
    normalized.includes('429') ||
    normalized.includes('rate-limited upstream') ||
    normalized.includes('maxretriesexceeded') ||
    normalized.includes('failed after 3 attempts') ||
    normalized.includes('retry shortly')
  )
}
