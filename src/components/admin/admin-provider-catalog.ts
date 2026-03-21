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
  return (
    PROVIDER_TYPES.find((provider) => provider.value === providerType)
      ?.defaultBaseURL ?? ''
  )
}
