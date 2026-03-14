import { createTool, type ToolCtx } from '@convex-dev/agent'
import { z } from 'zod'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'

const updateThreadMetadataInputSchema = z.object({
  title: z
    .string()
    .min(3)
    .max(60)
    .optional()
    .describe(
      'A short thread title, ideally 3-6 words and under 60 characters.',
    ),
  emoji: z
    .string()
    .min(1)
    .max(16)
    .optional()
    .describe('A single emoji that best matches the current thread topic.'),
  icon: z
    .string()
    .min(1)
    .max(40)
    .optional()
    .describe(
      'Optional Lucide icon name when you are confident it matches the thread.',
    ),
}).refine(
  (value) =>
    Boolean(value.title?.trim() || value.emoji?.trim() || value.icon?.trim()),
  {
    message: 'Provide at least one of title, emoji, or icon.',
  },
)

function errorToMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

function getUserId(ctx: ToolCtx) {
  if (!ctx.userId) {
    throw new Error('Missing userId in thread metadata tool context')
  }
  return ctx.userId as Id<'users'>
}

function getThreadId(ctx: ToolCtx) {
  if (!ctx.threadId) {
    throw new Error('Missing threadId in thread metadata tool context')
  }
  return ctx.threadId
}

export const threadMetadataTools = {
  update_thread_metadata: createTool({
    description:
      'Update the current thread title, emoji, and optional icon when the conversation topic becomes clear or changes.',
    inputSchema: updateThreadMetadataInputSchema,
    execute: async (ctx, input) => {
      try {
        const updated = await ctx.runMutation(
          internal.agents.applyThreadMetadataUpdate,
          {
            threadId: getThreadId(ctx),
            userId: getUserId(ctx),
            title: input.title,
            emoji: input.emoji,
            icon: input.icon,
          },
        )

        return {
          ok: true,
          ...updated,
        }
      } catch (error) {
        return {
          ok: false,
          error: errorToMessage(error),
        }
      }
    },
  }),
}
