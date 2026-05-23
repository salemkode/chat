import type { Doc } from '../_generated/dataModel'

type ProviderType = Doc<'providers'>['providerType']

const PROVIDER_API_KEY_ENV_FALLBACKS: Record<ProviderType, readonly string[]> = {
  openrouter: ['OPENROUTER_API_KEY'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  google: ['GOOGLE_GENERATIVE_AI_API_KEY'],
  azure: ['AZURE_OPENAI_API_KEY', 'AZURE_API_KEY'],
  groq: ['GROQ_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  xai: ['XAI_API_KEY'],
  cerebras: ['CEREBRAS_API_KEY'],
  'openai-compatible': ['OPENAI_COMPATIBLE_API_KEY'],
  opencode: ['OPENCODE_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
  cohere: ['COHERE_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY'],
  fireworks: ['FIREWORKS_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  replicate: ['REPLICATE_API_TOKEN'],
  moonshot: ['MOONSHOT_API_KEY'],
  qwen: ['QWEN_API_KEY', 'DASHSCOPE_API_KEY'],
  stepfun: ['STEPFUN_API_KEY'],
}

function normalizeApiKey(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function resolveProviderApiKey(providerType: ProviderType, configuredApiKey?: string) {
  const configured = normalizeApiKey(configuredApiKey)
  if (configured) {
    return configured
  }

  const envVars = PROVIDER_API_KEY_ENV_FALLBACKS[providerType]
  for (const envVar of envVars) {
    const fromEnv = normalizeApiKey(process.env[envVar])
    if (fromEnv) {
      return fromEnv
    }
  }

  return undefined
}
