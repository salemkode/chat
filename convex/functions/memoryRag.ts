import { ConvexError } from 'convex/values'
import { RAG } from '@convex-dev/rag'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { components } from '../_generated/api'

const apiKey = process.env.OPENROUTER_API_KEY

export const openRouter = createOpenRouter({
  apiKey,
})

export const memoryRag = new RAG(components.rag, {
  textEmbeddingModel: openRouter.textEmbeddingModel(
    'openai/text-embedding-3-small',
  ),
  embeddingDimension: 1536,
  filterNames: ['userId', 'threadId', 'projectId'],
})

export const MEMORY_EXTRACTION_MODEL = 'openai/gpt-4o-mini'

export function ensureOpenRouterConfigured() {
  if (!apiKey) {
    throw new ConvexError({
      code: 'CONFIGURATION_ERROR',
      message: 'OPENROUTER_API_KEY is not configured',
    })
  }
}
