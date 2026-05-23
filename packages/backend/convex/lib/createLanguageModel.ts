import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAzure } from '@ai-sdk/azure'
import { createGroq } from '@ai-sdk/groq'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { match } from 'ts-pattern'
import type { Doc } from '../_generated/dataModel'
import type { ResolvedAuxiliaryModel } from './auxiliaryModel'
import { requireProviderApiKey, resolveProviderApiKey } from './providerApiKeys'

export function createLanguageModelFromAuxiliary(resolved: ResolvedAuxiliaryModel) {
  const providerType = resolved.providerType
  const modelId = resolved.modelId
  const apiKey = resolved.apiKey
  const customUrl = resolved.customUrl
  const config = resolved.config
  const resolvedApiKey = requireProviderApiKey(
    providerType,
    apiKey,
    `Cannot call ${modelId} through ${providerType}`,
  )

  return match(providerType)
    .with('openrouter', () => {
      return createOpenRouter({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
      }).chat(modelId)
    })
    .with('openai', () => {
      return createOpenAI({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        organization: config?.organization,
        project: config?.project,
        headers: config?.headers,
      }).chat(modelId)
    })
    .with('anthropic', () => {
      return createAnthropic({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        headers: config?.headers,
      }).languageModel(modelId)
    })
    .with('google', () => {
      return createGoogleGenerativeAI({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        headers: config?.headers,
      }).chat(modelId)
    })
    .with('azure', () => {
      return createAzure({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        headers: config?.headers,
      }).chat(modelId)
    })
    .with('groq', () => {
      return createGroq({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        headers: config?.headers,
      }).languageModel(modelId)
    })
    .with('deepseek', () => {
      return createDeepSeek({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        headers: config?.headers,
      }).chat(modelId)
    })
    .with('xai', () => {
      return createXai({
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        headers: config?.headers,
      }).chat(modelId)
    })
    .with('cerebras', () => {
      return createOpenAICompatible({
        name: 'cerebras',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.cerebras.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('openai-compatible', () => {
      if (!customUrl) {
        throw new Error('OpenAI-compatible provider requires customUrl')
      }
      return createOpenAICompatible({
        name: 'openai-compatible',
        apiKey: resolvedApiKey,
        baseURL: customUrl,
        includeUsage: true,
        headers: config?.headers,
        queryParams: config?.queryParams,
      })(modelId)
    })
    .with('opencode', () => {
      return createOpenAICompatible({
        name: 'opencode',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.opencode.ai/v1',
        includeUsage: true,
        headers: config?.headers,
      })(modelId)
    })
    .with('mistral', () => {
      return createOpenAICompatible({
        name: 'mistral',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.mistral.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('cohere', () => {
      return createOpenAICompatible({
        name: 'cohere',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.cohere.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('perplexity', () => {
      return createOpenAICompatible({
        name: 'perplexity',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.perplexity.ai',
        includeUsage: true,
      })(modelId)
    })
    .with('fireworks', () => {
      return createOpenAICompatible({
        name: 'fireworks',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.fireworks.ai/inference/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('together', () => {
      return createOpenAICompatible({
        name: 'together',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.together.xyz/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('moonshot', () => {
      return createOpenAICompatible({
        name: 'moonshot',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.moonshot.cn/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('qwen', () => {
      return createOpenAICompatible({
        name: 'qwen',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('stepfun', () => {
      return createOpenAICompatible({
        name: 'stepfun',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.stepfun.com/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('replicate', () => {
      throw new Error('Replicate provider not supported for auxiliary models')
    })
    .exhaustive()
}

export type ProviderType = Doc<'providers'>['providerType']
