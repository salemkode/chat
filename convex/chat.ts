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

type AgentThreadId = FunctionArgs<typeof components.agent.threads.getThread>['threadId']

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
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to delete a thread',
      })
    }

    let thread
    try {
      thread = await ctx.runQuery(components.agent.threads.getThread, {
        threadId: args.threadId as AgentThreadId,
      })
    } catch (error) {
      if (isInvalidThreadIdError(error)) {
        throw new ConvexError({
          code: 'NOT_FOUND',
          message: 'Thread not found',
        })
      }
      throw error
    }

    if (!thread || thread.userId !== userId) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Thread not found or you do not have access to it',
      })
    }

    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
      threadId: thread._id,
    })
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
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view messages',
      })
    }

    // If no threadId, return empty page structure
    if (!args.threadId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'No threadId provided',
      })
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
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to create a thread',
      })
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
      throw new ConvexError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to view thread',
      })
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
      throw error
    }

    if (!thread) {
      return null
    }

    // Get thread metadata
    const metadata = await ctx.db
      .query('threadMetadata')
      .withIndex('by_threadId', (q) => q.eq('threadId', thread._id))
      .first()

    return {
      ...thread,
      metadata,
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

  return normalized
    .replace(/Last error:\s*/gi, '')
    .replace(/Provider returned error/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
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
