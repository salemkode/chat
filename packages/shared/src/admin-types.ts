const PROVIDER_TYPES = [
  'openrouter',
  'openai',
  'anthropic',
  'google',
  'azure',
  'groq',
  'deepseek',
  'xai',
  'cerebras',
  'openai-compatible',
  'opencode',
  'mistral',
  'cohere',
  'perplexity',
  'fireworks',
  'together',
  'replicate',
  'moonshot',
  'qwen',
  'stepfun',
] as const

const ICON_TYPES = ['emoji', 'lucide', 'phosphor', 'upload'] as const
const APP_PLANS = ['free', 'pro'] as const

const RATE_LIMIT_SCOPES = ['global', 'user'] as const
const RATE_LIMIT_KINDS = ['fixed window', 'token bucket'] as const

export type ProviderType = (typeof PROVIDER_TYPES)[number]
export type IconType = (typeof ICON_TYPES)[number]
export type AppPlan = (typeof APP_PLANS)[number]
export type RateLimitScope = (typeof RATE_LIMIT_SCOPES)[number]
export type RateLimitKind = (typeof RATE_LIMIT_KINDS)[number]

export type RateLimitPolicy = {
  enabled: boolean
  scope: RateLimitScope
  kind: RateLimitKind
  rate: number
  period: number
  capacity?: number
  shards?: number
}

export function isProviderType(value: unknown): value is ProviderType {
  return typeof value === 'string' && PROVIDER_TYPES.includes(value as ProviderType)
}

export function isIconType(value: unknown): value is IconType {
  return typeof value === 'string' && ICON_TYPES.includes(value as IconType)
}

export function isAppPlan(value: unknown): value is AppPlan {
  return typeof value === 'string' && APP_PLANS.includes(value as AppPlan)
}

export function isRateLimitScope(value: unknown): value is RateLimitScope {
  return typeof value === 'string' && RATE_LIMIT_SCOPES.includes(value as RateLimitScope)
}

export function isRateLimitKind(value: unknown): value is RateLimitKind {
  return typeof value === 'string' && RATE_LIMIT_KINDS.includes(value as RateLimitKind)
}

export function isRateLimitPolicy(value: unknown): value is RateLimitPolicy {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.enabled === 'boolean' &&
    isRateLimitScope(value.scope) &&
    isRateLimitKind(value.kind) &&
    typeof value.rate === 'number' &&
    Number.isFinite(value.rate) &&
    typeof value.period === 'number' &&
    Number.isFinite(value.period) &&
    (value.capacity === undefined ||
      (typeof value.capacity === 'number' && Number.isFinite(value.capacity))) &&
    (value.shards === undefined ||
      (typeof value.shards === 'number' && Number.isFinite(value.shards)))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export { APP_PLANS, ICON_TYPES, PROVIDER_TYPES, RATE_LIMIT_KINDS, RATE_LIMIT_SCOPES }
