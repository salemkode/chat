import { internalAction } from '../_generated/server'
import type { FunctionReturnType } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { z } from 'zod'
import { components, internal } from '../_generated/api'
import { extractMessageText, shouldSkipExtractedMemory } from './memoryShared'
import { createLanguageModelFromAuxiliary } from '../lib/createLanguageModel'
import { generateStructuredObject } from '../lib/generateStructuredObject'
import { hasConfiguredAuxiliaryModel } from '../lib/auxiliaryModel'

const MAX_TRANSCRIPT_CHARS = 12_000

const extractionSchema = z.object({
  memories: z.array(
    z.object({
      title: z.string().min(1).max(120),
      content: z.string().min(1).max(1000),
      category: z.string().min(1).max(80).optional(),
      tags: z.array(z.string().min(1).max(40)).max(8).optional(),
      scope: z.enum(['user', 'thread', 'project']),
    }),
  ),
})

function buildExtractionTranscript(
  messages: Array<{
    message?: {
      role?: string
      content?: unknown
    }
    text?: string
  }>,
) {
  const lines = messages
    .map((message) => {
      const role = message.message?.role ?? 'unknown'
      const text = extractMessageText(message)
      if (!text) return null
      return `${role}: ${text}`
    })
    .filter((line): line is string => line !== null)

  let transcript = lines.join('\n')
  if (transcript.length <= MAX_TRANSCRIPT_CHARS) {
    return transcript
  }

  transcript = transcript.slice(-MAX_TRANSCRIPT_CHARS)
  const firstNewline = transcript.indexOf('\n')
  if (firstNewline !== -1) {
    transcript = transcript.slice(firstNewline + 1)
  }

  return transcript
}

type ThreadMessageBatch = FunctionReturnType<
  typeof components.agent.messages.listMessagesByThreadId
>

function getExtractionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    const errorObj = error as { message?: string }
    return errorObj.message || JSON.stringify(errorObj)
  }

  return 'Failed to extract memories'
}

function isRetryableUpstreamRateLimit(error: unknown) {
  const message = getExtractionErrorMessage(error).toLowerCase()
  const hasRateLimitHint =
    message.includes('429') ||
    message.includes('rate-limited upstream') ||
    message.includes('retry shortly') ||
    message.includes('maxretriesexceeded') ||
    message.includes('too many requests')

  return hasRateLimitHint
}

function isStructuredOutputFailure(error: unknown) {
  const message = getExtractionErrorMessage(error).toLowerCase()
  return (
    message.includes('no object generated') ||
    message.includes('could not parse the response') ||
    message.includes('not valid json') ||
    message.includes('did not match the expected structure') ||
    message.includes('returned an empty response')
  )
}

export const extractMemoriesFromThread = internalAction({
  args: {
    threadId: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const auxiliary = await ctx.runQuery(internal.auxiliaryModels.resolveAuxiliaryModel, {
      userId: args.userId,
    })

    if (!hasConfiguredAuxiliaryModel(auxiliary)) {
      return { created: 0, skipped: 0, processedMessages: 0 }
    }

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    })

    if (!thread?.userId) {
      return { created: 0, skipped: 0, processedMessages: 0 }
    }
    const userId = thread.userId as Id<'users'>

    const existingState = await ctx.runQuery(
      internal.functions.memoryInternal.getExtractionStateByThread,
      {
        threadId: args.threadId,
      },
    )

    const lastProcessedOrder = existingState?.lastProcessedOrder ?? -1
    await ctx.runMutation(internal.functions.memoryInternal.upsertExtractionState, {
      threadId: args.threadId,
      userId,
      lastProcessedOrder,
      updatedAt: Date.now(),
      status: 'running',
      error: undefined,
    })

    let cursor: string | null = null
    const messages: Array<{
      _id: string
      order: number
      role?: string
      text?: string
      message?: {
        role?: string
        content?: unknown
      }
    }> = []

    try {
      while (true) {
        const batch: ThreadMessageBatch = await ctx.runQuery(
          components.agent.messages.listMessagesByThreadId,
          {
            threadId: args.threadId,
            order: 'asc',
            excludeToolMessages: true,
            statuses: ['success'],
            paginationOpts: {
              cursor,
              numItems: 100,
            },
          },
        )

        messages.push(...batch.page.filter((message) => message.order > lastProcessedOrder))

        if (batch.isDone) break
        cursor = batch.continueCursor
      }

      if (messages.length === 0) {
        await ctx.runMutation(internal.functions.memoryInternal.upsertExtractionState, {
          threadId: args.threadId,
          userId,
          lastProcessedOrder,
          updatedAt: Date.now(),
          status: 'idle',
          error: undefined,
        })
        return { created: 0, skipped: 0, processedMessages: 0 }
      }

      const transcript = buildExtractionTranscript(messages)

      if (!transcript.trim()) {
        const lastOrder = messages[messages.length - 1]?.order ?? lastProcessedOrder
        await ctx.runMutation(internal.functions.memoryInternal.upsertExtractionState, {
          threadId: args.threadId,
          userId,
          lastProcessedOrder: lastOrder,
          updatedAt: Date.now(),
          status: 'idle',
          error: undefined,
        })
        return { created: 0, skipped: 0, processedMessages: messages.length }
      }

      const projects = await ctx.runQuery(internal.functions.memoryInternal.listProjectsForThread, {
        userId,
        threadId: args.threadId,
      })
      const project = projects[0] ?? null

      const projectContext = project
        ? `Project linked to this thread: ${project.name} (${project._id})`
        : 'No project is currently linked to this thread.'

      const object = await generateStructuredObject({
        model: createLanguageModelFromAuxiliary(auxiliary),
        schema: extractionSchema,
        schemaName: 'MemoryExtraction',
        schemaDescription:
          'Stable long-term memories extracted from a chat transcript, or an empty list when none qualify.',
        system: [
          'Extract only stable, long-term memories that should be remembered for future chats.',
          'Do not include transient status updates, one-off requests, or short-lived facts.',
          'Prefer user scope for durable user preferences and profile facts.',
          'Use thread scope for details that matter mainly to this conversation.',
          'Use project scope only for facts that apply to the project attached to this thread.',
          'Return {"memories": []} when nothing qualifies.',
          'Respond with JSON only. Do not wrap the response in markdown or add commentary.',
        ].join('\n'),
        prompt: [projectContext, '', 'Transcript:', transcript].join('\n'),
        temperature: 0.2,
        maxOutputTokens: 4096,
      })

      let created = 0
      let skipped = 0
      const originMessageIds = messages.map((message) => message._id)

      for (const memory of object.memories) {
        if (shouldSkipExtractedMemory(memory)) {
          skipped += 1
          continue
        }

        if (memory.scope === 'project') {
          if (!project) {
            skipped += 1
            continue
          }

          await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
            scope: 'project',
            userId,
            projectId: project._id,
            title: memory.title,
            content: memory.content,
            category: memory.category,
            tags: memory.tags,
            source: 'extracted',
            originThreadId: args.threadId,
            originMessageIds,
          })
          created += 1
          continue
        }

        await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
          scope: memory.scope,
          userId,
          threadId: memory.scope === 'thread' ? args.threadId : undefined,
          title: memory.title,
          content: memory.content,
          category: memory.category,
          tags: memory.tags,
          source: 'extracted',
          originThreadId: args.threadId,
          originMessageIds,
        })
        created += 1
      }

      const lastOrder = messages[messages.length - 1]?.order ?? lastProcessedOrder
      await ctx.runMutation(internal.functions.memoryInternal.upsertExtractionState, {
        threadId: args.threadId,
        userId,
        lastProcessedOrder: lastOrder,
        updatedAt: Date.now(),
        status: 'idle',
        error: undefined,
      })

      return { created, skipped, processedMessages: messages.length }
    } catch (error) {
      const processedMessages = messages.length
      const lastOrder =
        processedMessages > 0
          ? (messages[processedMessages - 1]?.order ?? lastProcessedOrder)
          : lastProcessedOrder
      const message = isRetryableUpstreamRateLimit(error)
        ? 'Memory extraction is temporarily rate-limited upstream. It will succeed on a later retry.'
        : isStructuredOutputFailure(error)
          ? 'Memory extraction could not parse the auxiliary model response. The transcript was skipped for now.'
          : getExtractionErrorMessage(error)
      const shouldAdvanceCursor =
        isStructuredOutputFailure(error) && processedMessages > 0

      await ctx.runMutation(internal.functions.memoryInternal.upsertExtractionState, {
        threadId: args.threadId,
        userId,
        lastProcessedOrder: shouldAdvanceCursor ? lastOrder : lastProcessedOrder,
        updatedAt: Date.now(),
        status: 'error',
        error: message,
      })

      if (isRetryableUpstreamRateLimit(error) || isStructuredOutputFailure(error)) {
        return { created: 0, skipped: 0, processedMessages }
      }

      throw error
    }
  },
})
