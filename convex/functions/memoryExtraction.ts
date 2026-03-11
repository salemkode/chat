// @ts-nocheck
import { generateObject } from 'ai'
import { internalAction } from '../_generated/server'
import { v } from 'convex/values'
import { z } from 'zod'
import { components, internal } from '../_generated/api'
import {
  MEMORY_EXTRACTION_MODEL,
  ensureOpenRouterConfigured,
  openRouter,
} from './memoryRag'
import { extractMessageText, shouldSkipExtractedMemory } from './memoryShared'

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

export const extractMemoriesFromThread = internalAction({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    ensureOpenRouterConfigured()

    const thread = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    })

    if (!thread?.userId) {
      return { created: 0, skipped: 0, processedMessages: 0 }
    }

    const existingState = await ctx.runQuery(
      internal.functions.memoryInternal.getExtractionStateByThread,
      {
        threadId: args.threadId,
      },
    )

    const lastProcessedOrder = existingState?.lastProcessedOrder ?? -1
    await ctx.runMutation(
      internal.functions.memoryInternal.upsertExtractionState,
      {
        threadId: args.threadId,
        userId: thread.userId,
        lastProcessedOrder,
        updatedAt: Date.now(),
        status: 'running',
        error: undefined,
      },
    )

    try {
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

      while (true) {
        const batch: any = await ctx.runQuery(
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

        messages.push(
          ...batch.page.filter(
            (message: any) => message.order > lastProcessedOrder,
          ),
        )

        if (batch.isDone) break
        cursor = batch.continueCursor
      }

      if (messages.length === 0) {
        await ctx.runMutation(
          internal.functions.memoryInternal.upsertExtractionState,
          {
            threadId: args.threadId,
            userId: thread.userId,
            lastProcessedOrder,
            updatedAt: Date.now(),
            status: 'idle',
            error: undefined,
          },
        )
        return { created: 0, skipped: 0, processedMessages: 0 }
      }

      const transcript = messages
        .map((message) => {
          const role = message.message?.role ?? 'unknown'
          const text = extractMessageText(message)
          if (!text) return null
          return `${role}: ${text}`
        })
        .filter((line): line is string => line !== null)
        .join('\n')

      if (!transcript.trim()) {
        const lastOrder =
          messages[messages.length - 1]?.order ?? lastProcessedOrder
        await ctx.runMutation(
          internal.functions.memoryInternal.upsertExtractionState,
          {
            threadId: args.threadId,
            userId: thread.userId,
            lastProcessedOrder: lastOrder,
            updatedAt: Date.now(),
            status: 'idle',
            error: undefined,
          },
        )
        return { created: 0, skipped: 0, processedMessages: messages.length }
      }

      const projects = await ctx.runQuery(
        internal.functions.memoryInternal.listProjectsForThread,
        {
          userId: thread.userId,
          threadId: args.threadId,
        },
      )

      const projectContext =
        projects.length > 0
          ? `Projects linked to this thread: ${projects
              .map((project: any) => `${project.name} (${project._id})`)
              .join(', ')}`
          : 'No projects are currently linked to this thread.'

      const { object } = await generateObject({
        model: openRouter.chat(MEMORY_EXTRACTION_MODEL),
        schema: extractionSchema,
        prompt: [
          'Extract only stable, long-term memories that should be remembered for future chats.',
          'Do not include transient status updates, one-off requests, or short-lived facts.',
          'Prefer user scope for durable user preferences and profile facts.',
          'Use thread scope for details that matter mainly to this conversation.',
          'Use project scope only for facts that apply to the project(s) attached to this thread.',
          'Return an empty array when nothing qualifies.',
          projectContext,
          '',
          'Transcript:',
          transcript,
        ].join('\n'),
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
          if (projects.length === 0) {
            skipped += 1
            continue
          }

          for (const project of projects) {
            await ctx.runAction(
              internal.functions.memoryInternal.createMemoryInScope,
              {
                scope: 'project',
                userId: thread.userId,
                projectId: project._id,
                title: memory.title,
                content: memory.content,
                category: memory.category,
                tags: memory.tags,
                source: 'extracted',
                originThreadId: args.threadId,
                originMessageIds,
              },
            )
            created += 1
          }
          continue
        }

        await ctx.runAction(
          internal.functions.memoryInternal.createMemoryInScope,
          {
            scope: memory.scope,
            userId: thread.userId,
            threadId: memory.scope === 'thread' ? args.threadId : undefined,
            title: memory.title,
            content: memory.content,
            category: memory.category,
            tags: memory.tags,
            source: 'extracted',
            originThreadId: args.threadId,
            originMessageIds,
          },
        )
        created += 1
      }

      const lastOrder =
        messages[messages.length - 1]?.order ?? lastProcessedOrder
      await ctx.runMutation(
        internal.functions.memoryInternal.upsertExtractionState,
        {
          threadId: args.threadId,
          userId: thread.userId,
          lastProcessedOrder: lastOrder,
          updatedAt: Date.now(),
          status: 'idle',
          error: undefined,
        },
      )

      return { created, skipped, processedMessages: messages.length }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to extract memories'

      await ctx.runMutation(
        internal.functions.memoryInternal.upsertExtractionState,
        {
          threadId: args.threadId,
          userId: thread.userId,
          lastProcessedOrder,
          updatedAt: Date.now(),
          status: 'error',
          error: message,
        },
      )

      throw error
    }
  },
})
