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

type AgentThreadId = FunctionArgs<
  typeof components.agent.threads.getThread
>['threadId']

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
  return (
    error instanceof Error &&
    error.message.includes('does not match the table name in validator')
  )
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
      return { page: [], isDone: true, continueCursor: '', streams: [] }
    }

    // If no threadId, return empty page structure
    if (!args.threadId) {
      return { page: [], isDone: true, continueCursor: '', streams: [] }
    }

    const paginated = await listAgentMessages(ctx, components.agent, args)
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

      const errorText = formatFailedMessage(
        failedErrorsByOrder.get(message.order),
      )

      return {
        ...message,
        text: message.text ? `${message.text}\n\n${errorText}` : errorText,
      }
    })

    const streams = await syncStreams(ctx, components.agent, args)

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

    const thread = await ctx.runMutation(
      components.agent.threads.createThread,
      {
        userId,
      },
    )

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

    const project = metadata?.projectId
      ? await ctx.db.get(metadata.projectId)
      : null

    return {
      _id: thread._id,
      _creationTime: thread._creationTime,
      title: thread.title,
      userId: thread.userId,
      metadata: metadata ?? null,
      project:
        project && project.userId === userId
          ? {
              id: project._id.toString(),
              name: project.name,
              description: project.description,
            }
          : null,
    }
  },
})

function formatFailedMessage(error: string | undefined): string {
  const cleaned = sanitizeFailedMessage(error)

  if (!cleaned) {
    return 'This message failed to generate.'
  }

  return `Message failed: ${cleaned}`
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
