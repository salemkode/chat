export type ProviderType =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'groq'
  | 'deepseek'
  | 'xai'
  | 'cerebras'
  | 'openai-compatible'
  | 'opencode'
  | 'mistral'
  | 'cohere'
  | 'perplexity'
  | 'fireworks'
  | 'together'
  | 'replicate'
  | 'moonshot'
  | 'qwen'
  | 'stepfun'

export const PROVIDER_TYPES: Array<{
  value: ProviderType
  label: string
  defaultBaseURL?: string
}> = [
  {
    value: 'openrouter',
    label: 'OpenRouter',
    defaultBaseURL: 'https://openrouter.ai/api/v1',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    defaultBaseURL: 'https://api.openai.com/v1',
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    defaultBaseURL: 'https://api.anthropic.com/v1',
  },
  {
    value: 'google',
    label: 'Google AI Studio',
    defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
  },
  { value: 'azure', label: 'Azure OpenAI' },
  {
    value: 'groq',
    label: 'Groq',
    defaultBaseURL: 'https://api.groq.com/openai/v1',
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    defaultBaseURL: 'https://api.deepseek.com',
  },
  { value: 'xai', label: 'xAI', defaultBaseURL: 'https://api.x.ai/v1' },
  {
    value: 'cerebras',
    label: 'Cerebras',
    defaultBaseURL: 'https://api.cerebras.ai/v1',
  },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  {
    value: 'opencode',
    label: 'OpenCode',
    defaultBaseURL: 'https://api.opencode.ai/v1',
  },
  {
    value: 'mistral',
    label: 'Mistral',
    defaultBaseURL: 'https://api.mistral.ai/v1',
  },
  {
    value: 'cohere',
    label: 'Cohere',
    defaultBaseURL: 'https://api.cohere.ai/v1',
  },
  {
    value: 'perplexity',
    label: 'Perplexity',
    defaultBaseURL: 'https://api.perplexity.ai',
  },
  {
    value: 'fireworks',
    label: 'Fireworks',
    defaultBaseURL: 'https://api.fireworks.ai/inference/v1',
  },
  {
    value: 'together',
    label: 'Together',
    defaultBaseURL: 'https://api.together.xyz/v1',
  },
  { value: 'replicate', label: 'Replicate' },
  {
    value: 'moonshot',
    label: 'Moonshot',
    defaultBaseURL: 'https://api.moonshot.cn/v1',
  },
  {
    value: 'qwen',
    label: 'Qwen',
    defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  {
    value: 'stepfun',
    label: 'StepFun',
    defaultBaseURL: 'https://api.stepfun.com/v1',
  },
] as const

export function defaultBaseURL(providerType: ProviderType) {
  return PROVIDER_TYPES.find((provider) => provider.value === providerType)?.defaultBaseURL ?? ''
}

const PROVIDER_FORM_HINTS: Record<
  ProviderType,
  { apiKeyPlaceholder: string; baseURLNote?: string }
> = {
  openrouter: {
    apiKeyPlaceholder: 'sk-or-v1-...',
  },
  openai: {
    apiKeyPlaceholder: 'sk-...',
  },
  anthropic: {
    apiKeyPlaceholder: 'sk-ant-api03-...',
  },
  google: {
    apiKeyPlaceholder: 'AIza... (Google AI Studio API key)',
  },
  azure: {
    apiKeyPlaceholder: 'Azure OpenAI API key',
    baseURLNote: 'Use your resource endpoint, e.g. https://YOUR_RESOURCE.openai.azure.com/openai',
  },
  groq: {
    apiKeyPlaceholder: 'gsk_...',
  },
  deepseek: {
    apiKeyPlaceholder: 'sk-...',
  },
  xai: {
    apiKeyPlaceholder: 'xai-...',
  },
  cerebras: {
    apiKeyPlaceholder: 'csk-...',
  },
  'openai-compatible': {
    apiKeyPlaceholder: 'Bearer token or API key for your server',
    baseURLNote: 'Full base URL of the OpenAI-compatible API (often ends in /v1).',
  },
  opencode: {
    apiKeyPlaceholder: 'API key from OpenCode',
  },
  mistral: {
    apiKeyPlaceholder: 'mistral-... or API key from La Plateforme',
  },
  cohere: {
    apiKeyPlaceholder: 'cohere API key',
  },
  perplexity: {
    apiKeyPlaceholder: 'pplx-...',
  },
  fireworks: {
    apiKeyPlaceholder: 'fw_...',
  },
  together: {
    apiKeyPlaceholder: 'Together API key',
  },
  replicate: {
    apiKeyPlaceholder: 'r8_...',
    baseURLNote: 'Optional; discovery is limited for Replicate.',
  },
  moonshot: {
    apiKeyPlaceholder: 'sk-...',
  },
  qwen: {
    apiKeyPlaceholder: 'DashScope API key',
  },
  stepfun: {
    apiKeyPlaceholder: 'StepFun API key',
  },
}

export function getProviderFormHints(providerType: ProviderType) {
  const hints = PROVIDER_FORM_HINTS[providerType]
  const fallbackUrl = defaultBaseURL(providerType)
  return {
    apiKeyPlaceholder: hints.apiKeyPlaceholder,
    baseURLPlaceholder: fallbackUrl || 'https://api.example.com/v1',
    baseURLNote: hints.baseURLNote,
  }
}
