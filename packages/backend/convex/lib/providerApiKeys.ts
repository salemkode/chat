import type { Doc } from '../_generated/dataModel'

type ProviderType = Doc<'providers'>['providerType']

function normalizeApiKey(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function isPlausibleOpenRouterApiKey(value?: string) {
  const normalized = normalizeApiKey(value)
  return Boolean(normalized?.startsWith('sk-or-'))
}

export function resolveProviderApiKey(_providerType: ProviderType, configuredApiKey?: string) {
  return normalizeApiKey(configuredApiKey)
}

export function describeProviderApiKeySources(_providerType: ProviderType) {
  return 'an API key in Admin → Providers'
}

export function hasResolvableProviderApiKey(
  providerType: ProviderType,
  configuredApiKey?: string,
) {
  return resolveProviderApiKey(providerType, configuredApiKey) !== undefined
}

export function requireProviderApiKey(
  providerType: ProviderType,
  configuredApiKey?: string,
  context?: string,
) {
  const resolved = resolveProviderApiKey(providerType, configuredApiKey)
  if (resolved) {
    if (providerType === 'openrouter' && !isPlausibleOpenRouterApiKey(resolved)) {
      const prefix = context ? `${context}. ` : ''
      throw new Error(
        `${prefix}OpenRouter API keys must start with sk-or-v1-. Update Admin → Providers with a key from openrouter.ai/keys.`,
      )
    }
    return resolved
  }

  const prefix = context ? `${context}. ` : ''
  throw new Error(
    `${prefix}Configure ${describeProviderApiKeySources(providerType)} for the ${providerType} provider.`,
  )
}

export function describeCollectionSuggestionAuthError(args: {
  providerName?: string
  providerType: ProviderType
}) {
  const providerLabel = args.providerName?.trim() || args.providerType
  return `Configure an API key for ${providerLabel} in Admin → Providers.`
}
