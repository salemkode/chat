import { RAG } from '@convex-dev/rag'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { internalQuery } from '../_generated/server'
import { v } from 'convex/values'
import { components, internal } from '../_generated/api'
import type { ActionCtx } from '../_generated/server'
import {
  isPlausibleOpenRouterApiKey,
  resolveProviderApiKey,
} from '../lib/providerApiKeys'

export const MEMORY_EMBEDDING_MODEL = 'openai/text-embedding-3-small'
const MEMORY_EMBEDDING_DIMENSION = 1536

export type MemoryRagClient = ReturnType<typeof createMemoryRag>

export function createMemoryRag(apiKey: string) {
  const openRouter = createOpenRouter({
    apiKey: apiKey.trim(),
  })

  return new RAG(components.rag, {
    textEmbeddingModel: openRouter.textEmbeddingModel(MEMORY_EMBEDDING_MODEL),
    embeddingDimension: MEMORY_EMBEDDING_DIMENSION,
    filterNames: ['userId', 'threadId', 'projectId'],
  })
}

export const resolveOpenRouterProviderForMemory = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      apiKey: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const providers = await ctx.db
      .query('providers')
      .withIndex('by_enabled', (q) => q.eq('isEnabled', true))
      .collect()

    for (const provider of providers) {
      if (provider.providerType !== 'openrouter') {
        continue
      }

      const apiKey = resolveProviderApiKey(provider.providerType, provider.apiKey)
      if (apiKey && isPlausibleOpenRouterApiKey(apiKey)) {
        return { apiKey }
      }
    }

    return null
  },
})

export async function resolveMemoryRag(ctx: Pick<ActionCtx, 'runQuery'>) {
  const provider = await ctx.runQuery(
    internal.functions.memoryRag.resolveOpenRouterProviderForMemory,
    {},
  )

  if (!provider) {
    return null
  }

  return createMemoryRag(provider.apiKey)
}

export async function requireMemoryRag(ctx: Pick<ActionCtx, 'runQuery'>) {
  const rag = await resolveMemoryRag(ctx)
  if (!rag) {
    throw new Error(
      'Memory search requires an enabled OpenRouter provider with an API key in Admin → Providers.',
    )
  }

  return rag
}

/** Legacy constant; runtime uses admin-configured OpenRouter embeddings. */
export const MEMORY_EXTRACTION_MODEL = MEMORY_EMBEDDING_MODEL
