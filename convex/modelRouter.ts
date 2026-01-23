import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

// Initialize AI SDK providers
// These will use environment variables: OPENAI_API_KEY and ANTHROPIC_API_KEY
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Mode types for the chat system
export type ChatMode = 'code' | 'learn' | 'think' | 'create'

// Model selection result
export interface ModelSelection {
  languageModel: LanguageModel
  maxTokens: number
  temperature: number
}

/**
 * Selects the optimal AI model based on chat mode and context size.
 *
 * Model Selection Rules:
 * - Code mode → GPT-4 Turbo (temp 0.2, maxTokens 8000)
 * - Learn mode → GPT-4 Turbo (temp 0.5, maxTokens 4000)
 * - Think mode → Claude 3 Opus (temp 0.8, maxTokens 4000)
 * - Create mode → GPT-4 Turbo (temp 0.9, maxTokens 6000)
 *
 * Long Context Adjustment:
 * - If contextTokenCount > 6000, use Claude instead (better for long contexts)
 *
 * @param mode - The chat mode (code/learn/think/create)
 * @param contextTokenCount - The number of tokens in the context (optional)
 * @returns Model selection with language model, max tokens, and temperature
 */
export function selectModel(
  mode: ChatMode,
  contextTokenCount?: number,
): ModelSelection {
  // Check if we have long context (>6000 tokens)
  const hasLongContext =
    contextTokenCount !== undefined && contextTokenCount > 6000

  // Select model based on mode and context
  switch (mode) {
    case 'code':
      // Code mode: GPT-4 Turbo with low temperature for precision
      if (hasLongContext) {
        // Use Claude for long context even in code mode
        return {
          languageModel: anthropic('claude-3-opus-20240229'),
          maxTokens: 8000,
          temperature: 0.2,
        }
      }
      return {
        languageModel: openai.chat('gpt-4-turbo'),
        maxTokens: 8000,
        temperature: 0.2,
      }

    case 'learn':
      // Learn mode: GPT-4 Turbo with medium temperature
      if (hasLongContext) {
        return {
          languageModel: anthropic('claude-3-opus-20240229'),
          maxTokens: 4000,
          temperature: 0.5,
        }
      }
      return {
        languageModel: openai.chat('gpt-4-turbo'),
        maxTokens: 4000,
        temperature: 0.5,
      }

    case 'think':
      // Think mode: Claude 3 Opus with higher temperature for reasoning
      // Always use Claude for think mode, regardless of context length
      return {
        languageModel: anthropic('claude-3-opus-20240229'),
        maxTokens: 4000,
        temperature: 0.8,
      }

    case 'create':
      // Create mode: GPT-4 Turbo with high temperature for creativity
      if (hasLongContext) {
        return {
          languageModel: anthropic('claude-3-opus-20240229'),
          maxTokens: 6000,
          temperature: 0.9,
        }
      }
      return {
        languageModel: openai.chat('gpt-4-turbo'),
        maxTokens: 6000,
        temperature: 0.9,
      }

    default:
      // Default to GPT-4 Turbo with balanced settings
      return {
        languageModel: openai.chat('gpt-4-turbo'),
        maxTokens: 4000,
        temperature: 0.7,
      }
  }
}
