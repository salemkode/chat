import { createTool, type ToolCtx } from '@convex-dev/agent'
import { z } from 'zod'
import type { Id } from '../_generated/dataModel'
import { internal } from '../_generated/api'

const projectSearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  maxResults: z.number().int().min(1).max(10).optional(),
})

const projectGetInputSchema = z.object({
  artifactId: z.string().min(1),
})

function requireToolContextIds(ctx: ToolCtx) {
  if (!ctx.userId || !ctx.threadId) {
    throw new Error('Missing user/thread context for project tools')
  }
  return {
    userId: ctx.userId as Id<'users'>,
    threadId: ctx.threadId,
  }
}

async function resolveThreadProject(ctx: ToolCtx) {
  const { userId, threadId } = requireToolContextIds(ctx)
  return await ctx.runQuery(internal.functions.memoryInternal.getProjectForThread, {
    userId,
    threadId,
  })
}

function errorToMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown project context tool error'
}

export const projectContextTools = {
  project_context_search: createTool({
    description:
      'Search project-linked artifacts and docs for relevant context in this project chat.',
    inputSchema: projectSearchInputSchema,
    execute: async (ctx, input) => {
      try {
        const project = await resolveThreadProject(ctx)
        if (!project) {
          return {
            ok: false,
            query: input.query,
            hits: [],
            error: 'No project is linked to this thread.',
          }
        }

        const userId = requireToolContextIds(ctx).userId
        const hits = await ctx.runQuery(internal.functions.projectRetrieval.searchProjectContext, {
          projectId: project._id,
          userId,
          query: input.query,
          maxResults: input.maxResults ?? 5,
        })

        return {
          ok: true,
          query: input.query,
          hits: hits.map((hit) => ({
            artifactId: hit.artifactId.toString(),
            title: hit.title,
            kind: hit.kind,
            provider: hit.provider,
            url: hit.url,
            snippet: hit.snippet,
            score: hit.score,
          })),
        }
      } catch (error) {
        return {
          ok: false,
          query: input.query,
          hits: [],
          error: errorToMessage(error),
        }
      }
    },
  }),

  project_context_get: createTool({
    description:
      'Get a specific project artifact/document by artifactId, including extracted text when available.',
    inputSchema: projectGetInputSchema,
    execute: async (ctx, input) => {
      try {
        const project = await resolveThreadProject(ctx)
        if (!project) {
          return {
            ok: false,
            artifact: null,
            error: 'No project is linked to this thread.',
          }
        }

        const userId = requireToolContextIds(ctx).userId
        const artifact = await ctx.runQuery(
          internal.functions.projectRetrieval.getArtifactByIdForProject,
          {
            projectId: project._id,
            artifactId: input.artifactId as Id<'projectArtifacts'>,
            userId,
          },
        )

        return {
          ok: Boolean(artifact),
          artifact: artifact ?? null,
          error: artifact ? undefined : 'Artifact not found in this project.',
        }
      } catch (error) {
        return {
          ok: false,
          artifact: null,
          error: errorToMessage(error),
        }
      }
    },
  }),
}
