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
import { resolveProviderApiKey } from './providerApiKeys'

export function createLanguageModelFromAuxiliary(resolved: ResolvedAuxiliaryModel) {
  const providerType = resolved.providerType
  const modelId = resolved.modelId
  const apiKey = resolved.apiKey
  const customUrl = resolved.customUrl
  const config = resolved.config
  const resolvedApiKey = resolveProviderApiKey(providerType, apiKey)

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
      }).chat(modelId)
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
      if (!resolvedApiKey) {
        throw new Error('Cerebras provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'cerebras',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.cerebras.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('openai-compatible', () => {
      if (!customUrl || !resolvedApiKey) {
        throw new Error('OpenAI-compatible provider requires customUrl and apiKey')
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
      if (!resolvedApiKey) {
        throw new Error('OpenCode provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'opencode',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.opencode.ai/v1',
        includeUsage: true,
        headers: config?.headers,
      })(modelId)
    })
    .with('mistral', () => {
      if (!resolvedApiKey) {
        throw new Error('Mistral provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'mistral',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.mistral.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('cohere', () => {
      if (!resolvedApiKey) {
        throw new Error('Cohere provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'cohere',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.cohere.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('perplexity', () => {
      if (!resolvedApiKey) {
        throw new Error('Perplexity provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'perplexity',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.perplexity.ai',
        includeUsage: true,
      })(modelId)
    })
    .with('fireworks', () => {
      if (!resolvedApiKey) {
        throw new Error('Fireworks provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'fireworks',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.fireworks.ai/inference/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('together', () => {
      if (!resolvedApiKey) {
        throw new Error('Together provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'together',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.together.xyz/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('moonshot', () => {
      if (!resolvedApiKey) {
        throw new Error('Moonshot provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'moonshot',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://api.moonshot.cn/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('qwen', () => {
      if (!resolvedApiKey) {
        throw new Error('Qwen provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'qwen',
        apiKey: resolvedApiKey,
        baseURL: customUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('stepfun', () => {
      if (!resolvedApiKey) {
        throw new Error('StepFun provider requires apiKey')
      }
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
