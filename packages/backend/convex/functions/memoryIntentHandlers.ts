import { generateObject } from 'ai'
import { internalAction, type ActionCtx } from '../_generated/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { z } from 'zod'
import { internal } from '../_generated/api'
import { createLanguageModelFromAuxiliary } from '../lib/createLanguageModel'
import type { ToolPolicyAutomaticAction } from '../lib/toolPolicy'
import type { ResolvedAuxiliaryModel } from '../lib/auxiliaryModel'
import { hasConfiguredAuxiliaryModel } from '../lib/auxiliaryModel'

const memoryAddSchema = z.object({
  scope: z.enum(['user', 'thread', 'project']),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(1000),
  category: z.string().min(1).max(80).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
})

const memoryMutationPickSchema = z.object({
  scope: z.enum(['user', 'thread', 'project']),
  memoryId: z.string().min(1),
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(1000).optional(),
  category: z.string().max(80).optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).optional(),
})

type MemoryIntentResult = {
  automaticActions: ToolPolicyAutomaticAction[]
  systemAddendum: string
  error?: string
}

function formatSearchHits(
  hits: Array<{
    memoryId: string
    scope: string
    title: string
    content: string
    category?: string
    tags?: string[]
  }>,
) {
  if (hits.length === 0) {
    return 'No saved memories matched the request.'
  }

  return hits
    .map(
      (hit, index) =>
        `${index + 1}. [${hit.scope}] ${hit.title} (memoryId: ${hit.memoryId})\n${hit.content}`,
    )
    .join('\n\n')
}

async function runMemorySearch(
  ctx: ActionCtx,
  args: {
    userId: Id<'users'>
    threadId: string
    prompt: string
    projectId?: Id<'projects'>
  },
) {
  const result = await ctx.runAction(internal.functions.memoryContext.searchMemoriesForPrompt, {
    userId: args.userId,
    threadId: args.threadId,
    query: args.prompt,
    projectId: args.projectId,
    maxResults: 5,
  })

  return result.hits
}

async function runMemoryAddWithAuxiliary(
  ctx: ActionCtx,
  args: {
    userId: Id<'users'>
    threadId: string
    prompt: string
    auxiliary: ResolvedAuxiliaryModel
    linkedProjectId?: Id<'projects'>
  },
) {
  const projectContext = args.linkedProjectId
    ? `Project linked to this thread: ${args.linkedProjectId}`
    : 'No project is linked to this thread.'

  const { object } = await generateObject({
    model: createLanguageModelFromAuxiliary(args.auxiliary),
    schema: memoryAddSchema,
    prompt: [
      'Extract one durable memory the user explicitly asked to save.',
      'Prefer user scope for profile facts and preferences.',
      'Use thread scope for conversation-specific details.',
      'Use project scope only when the fact applies to the linked project.',
      'Return concise title and content.',
      projectContext,
      '',
      'User message:',
      args.prompt,
    ].join('\n'),
  })

  if (object.scope === 'project') {
    if (!args.linkedProjectId) {
      throw new Error('Cannot save project memory without a linked project')
    }

    await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
      scope: 'project',
      userId: args.userId,
      projectId: args.linkedProjectId,
      title: object.title,
      content: object.content,
      category: object.category,
      tags: object.tags,
      source: 'manual',
      originThreadId: args.threadId,
    })
    return object
  }

  await ctx.runAction(internal.functions.memoryInternal.createMemoryInScope, {
    scope: object.scope,
    userId: args.userId,
    threadId: object.scope === 'thread' ? args.threadId : undefined,
    title: object.title,
    content: object.content,
    category: object.category,
    tags: object.tags,
    source: 'manual',
    originThreadId: args.threadId,
  })

  return object
}

async function runMemoryMutationWithAuxiliary(
  ctx: ActionCtx,
  args: {
    userId: Id<'users'>
    threadId: string
    prompt: string
    auxiliary: ResolvedAuxiliaryModel
    mode: 'update' | 'delete'
    hits: Array<{
      memoryId: string
      scope: 'user' | 'thread' | 'project'
      title: string
      content: string
      category?: string
      tags?: string[]
    }>
  },
) {
  const { object } = await generateObject({
    model: createLanguageModelFromAuxiliary(args.auxiliary),
    schema: memoryMutationPickSchema,
    prompt: [
      `The user requested a memory ${args.mode}.`,
      'Pick the best matching memory from the candidates below.',
      'Only use memoryId values from the candidate list.',
      '',
      'User message:',
      args.prompt,
      '',
      'Candidates:',
      formatSearchHits(args.hits),
    ].join('\n'),
  })

  if (args.mode === 'delete') {
    await ctx.runAction(internal.functions.memoryInternal.deleteMemoryInScope, {
      scope: object.scope,
      userId: args.userId,
      userMemoryId: object.scope === 'user' ? (object.memoryId as Id<'userMemories'>) : undefined,
      threadMemoryId:
        object.scope === 'thread' ? (object.memoryId as Id<'threadMemories'>) : undefined,
      projectMemoryId:
        object.scope === 'project' ? (object.memoryId as Id<'projectMemories'>) : undefined,
    })
    return object
  }

  await ctx.runAction(internal.functions.memoryInternal.updateMemoryInScope, {
    scope: object.scope,
    userId: args.userId,
    userMemoryId: object.scope === 'user' ? (object.memoryId as Id<'userMemories'>) : undefined,
    threadMemoryId:
      object.scope === 'thread' ? (object.memoryId as Id<'threadMemories'>) : undefined,
    projectMemoryId:
      object.scope === 'project' ? (object.memoryId as Id<'projectMemories'>) : undefined,
    title: object.title,
    content: object.content,
    category: object.category,
    tags: object.tags,
  })

  return object
}

export const handleMemoryIntentWithoutTools = internalAction({
  args: {
    userId: v.id('users'),
    threadId: v.string(),
    prompt: v.string(),
    detectedIntent: v.union(
      v.literal('memory_search'),
      v.literal('memory_add'),
      v.literal('memory_update'),
      v.literal('memory_delete'),
    ),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args): Promise<MemoryIntentResult> => {
    const auxiliary = await ctx.runQuery(internal.auxiliaryModels.resolveAuxiliaryModel, {
      userId: args.userId,
    })

    if (
      args.detectedIntent !== 'memory_search' &&
      !hasConfiguredAuxiliaryModel(auxiliary)
    ) {
      return {
        automaticActions: ['memory_intent_failed'],
        systemAddendum: '',
        error:
          'Choose a background memory model in Settings → Memory to use memory commands without tool support.',
      }
    }

    const linkedProjects = await ctx.runQuery(
      internal.functions.memoryInternal.listProjectsForThread,
      {
        userId: args.userId,
        threadId: args.threadId,
      },
    )
    const linkedProject = linkedProjects[0] ?? null
    const resolvedProjectId = args.projectId ?? linkedProject?._id

    try {
      if (args.detectedIntent === 'memory_search') {
        const hits = await runMemorySearch(ctx, {
          userId: args.userId,
          threadId: args.threadId,
          prompt: args.prompt,
          projectId: resolvedProjectId,
        })

        return {
          automaticActions: ['memory_search_applied'],
          systemAddendum: [
            'SERVER MEMORY SEARCH RESULTS (authoritative for this turn):',
            formatSearchHits(hits),
            'Use these results when answering the user. Do not claim you searched if nothing matched.',
          ].join('\n\n'),
        }
      }

      if (args.detectedIntent === 'memory_add') {
        const saved = await runMemoryAddWithAuxiliary(ctx, {
          userId: args.userId,
          threadId: args.threadId,
          prompt: args.prompt,
          auxiliary,
          linkedProjectId: linkedProject?._id,
        })

        return {
          automaticActions: ['memory_add_applied'],
          systemAddendum: [
            'SERVER MEMORY SAVE (already completed before your reply):',
            `[${saved.scope}] ${saved.title}: ${saved.content}`,
            'Confirm what was saved briefly; do not call memory tools.',
          ].join('\n\n'),
        }
      }

      const hits = await runMemorySearch(ctx, {
        userId: args.userId,
        threadId: args.threadId,
        prompt: args.prompt,
        projectId: resolvedProjectId,
      })

      if (hits.length === 0) {
        return {
          automaticActions: ['memory_intent_failed'],
          systemAddendum: '',
          error: 'No matching memories were found for the requested change.',
        }
      }

      const normalizedHits = hits.map((hit) => ({
        memoryId: hit.memoryId,
        scope: hit.scope,
        title: hit.title,
        content: hit.content,
        category: hit.category,
        tags: hit.tags,
      }))

      if (args.detectedIntent === 'memory_delete') {
        const deleted = await runMemoryMutationWithAuxiliary(ctx, {
          userId: args.userId,
          threadId: args.threadId,
          prompt: args.prompt,
          auxiliary,
          mode: 'delete',
          hits: normalizedHits,
        })

        return {
          automaticActions: ['memory_delete_applied'],
          systemAddendum: [
            'SERVER MEMORY DELETE (already completed before your reply):',
            `Deleted [${deleted.scope}] ${deleted.memoryId}.`,
            'Confirm the deletion briefly; do not call memory tools.',
          ].join('\n\n'),
        }
      }

      const updated = await runMemoryMutationWithAuxiliary(ctx, {
        userId: args.userId,
        threadId: args.threadId,
        prompt: args.prompt,
        auxiliary,
        mode: 'update',
        hits: normalizedHits,
      })

      return {
        automaticActions: ['memory_update_applied'],
        systemAddendum: [
          'SERVER MEMORY UPDATE (already completed before your reply):',
          `Updated [${updated.scope}] ${updated.memoryId}.`,
          'Confirm the update briefly; do not call memory tools.',
        ].join('\n\n'),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Memory intent handling failed'
      return {
        automaticActions: ['memory_intent_failed'],
        systemAddendum: '',
        error: message,
      }
    }
  },
})
