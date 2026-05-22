import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { azure } from '@ai-sdk/azure'
import { groq } from '@ai-sdk/groq'
import { deepseek } from '@ai-sdk/deepseek'
import { xai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { match } from 'ts-pattern'
import type { Doc } from '../_generated/dataModel'
import type { ResolvedAuxiliaryModel } from './auxiliaryModel'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export function createLanguageModelFromAuxiliary(resolved: ResolvedAuxiliaryModel) {
  const providerType = resolved.providerType
  const modelId = resolved.modelId
  const apiKey = resolved.apiKey
  const customUrl = resolved.customUrl
  const config = resolved.config

  return match(providerType)
    .with('openrouter', () => openrouter.chat(modelId))
    .with('openai', () => openai.chat(modelId))
    .with('anthropic', () => anthropic.languageModel(modelId))
    .with('google', () => google.chat(modelId))
    .with('azure', () => azure.chat(modelId))
    .with('groq', () => groq(modelId))
    .with('deepseek', () => deepseek.chat(modelId))
    .with('xai', () => xai.chat(modelId))
    .with('cerebras', () => {
      if (!apiKey) {
        throw new Error('Cerebras provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'cerebras',
        apiKey,
        baseURL: customUrl || 'https://api.cerebras.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('openai-compatible', () => {
      if (!customUrl || !apiKey) {
        throw new Error('OpenAI-compatible provider requires customUrl and apiKey')
      }
      return createOpenAICompatible({
        name: 'openai-compatible',
        apiKey,
        baseURL: customUrl,
        includeUsage: true,
        headers: config?.headers,
        queryParams: config?.queryParams,
      })(modelId)
    })
    .with('opencode', () => {
      if (!apiKey) {
        throw new Error('OpenCode provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'opencode',
        apiKey,
        baseURL: customUrl || 'https://api.opencode.ai/v1',
        includeUsage: true,
        headers: config?.headers,
      })(modelId)
    })
    .with('mistral', () => {
      if (!apiKey) {
        throw new Error('Mistral provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'mistral',
        apiKey,
        baseURL: customUrl || 'https://api.mistral.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('cohere', () => {
      if (!apiKey) {
        throw new Error('Cohere provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'cohere',
        apiKey,
        baseURL: customUrl || 'https://api.cohere.ai/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('perplexity', () => {
      if (!apiKey) {
        throw new Error('Perplexity provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'perplexity',
        apiKey,
        baseURL: customUrl || 'https://api.perplexity.ai',
        includeUsage: true,
      })(modelId)
    })
    .with('fireworks', () => {
      if (!apiKey) {
        throw new Error('Fireworks provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'fireworks',
        apiKey,
        baseURL: customUrl || 'https://api.fireworks.ai/inference/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('together', () => {
      if (!apiKey) {
        throw new Error('Together provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'together',
        apiKey,
        baseURL: customUrl || 'https://api.together.xyz/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('moonshot', () => {
      if (!apiKey) {
        throw new Error('Moonshot provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'moonshot',
        apiKey,
        baseURL: customUrl || 'https://api.moonshot.cn/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('qwen', () => {
      if (!apiKey) {
        throw new Error('Qwen provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'qwen',
        apiKey,
        baseURL: customUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        includeUsage: true,
      })(modelId)
    })
    .with('stepfun', () => {
      if (!apiKey) {
        throw new Error('StepFun provider requires apiKey')
      }
      return createOpenAICompatible({
        name: 'stepfun',
        apiKey,
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
