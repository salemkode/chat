import {
  isIconType,
  isProviderType,
  isRateLimitKind,
  isRateLimitPolicy,
  isRateLimitScope,
  type IconType,
  type ProviderType,
  type RateLimitPolicy,
} from '../../shared/admin-types'

export type Theme = 'dark' | 'light' | 'system'

export type RedirectSearch = {
  redirect?: string
  redirect_url?: string
}

export function parseTheme(value: unknown, fallback: Theme = 'system'): Theme {
  return value === 'dark' || value === 'light' || value === 'system'
    ? value
    : fallback
}

export function parseRouteSearchRedirects(
  search: Record<string, unknown>,
): RedirectSearch {
  return {
    redirect: getOptionalString(search.redirect),
    redirect_url: getOptionalString(search.redirect_url),
  }
}

export function parseUploadResponse(value: unknown): { storageId: string } {
  if (!isRecord(value) || typeof value.storageId !== 'string') {
    throw new Error('Upload response is missing storageId')
  }

  return { storageId: value.storageId }
}

export function parseJsonRecord(text: string): Record<string, string> | undefined {
  const trimmed = text.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = JSON.parse(trimmed) as unknown
  if (!isRecord(parsed)) {
    throw new Error('Expected a JSON object')
  }

  const record = Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => {
      if (typeof value !== 'string') {
        throw new Error(`Expected "${key}" to be a string`)
      }

      return [key, value]
    }),
  )

  return record
}

export function readFileReaderResultAsString(result: string | ArrayBuffer | null) {
  if (typeof result !== 'string') {
    throw new Error('Expected FileReader to produce a data URL string')
  }

  return result
}

export function getRequiredEnv(
  env: Record<string, string | undefined>,
  key: string,
): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing ${key} environment variable`)
  }

  return value
}

export function parseProviderType(value: unknown): ProviderType {
  if (!isProviderType(value)) {
    throw new Error('Invalid provider type')
  }

  return value
}

export function parseIconType(value: unknown): IconType | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (!isIconType(value)) {
    throw new Error('Invalid icon type')
  }

  return value
}

export function parseRateLimitPolicy(value: unknown): RateLimitPolicy | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!isRateLimitPolicy(value)) {
    throw new Error('Invalid rate limit policy')
  }

  return value
}

export function parseRateLimitScope(
  value: unknown,
): RateLimitPolicy['scope'] {
  if (!isRateLimitScope(value)) {
    throw new Error('Invalid rate limit scope')
  }

  return value
}

export function parseRateLimitKind(value: unknown): RateLimitPolicy['kind'] {
  if (!isRateLimitKind(value)) {
    throw new Error('Invalid rate limit kind')
  }

  return value
}

export function toTypedRouteSearch(
  search: Record<string, string>,
): RedirectSearch | undefined {
  const parsed = parseRouteSearchRedirects(search)
  return parsed.redirect || parsed.redirect_url ? parsed : undefined
}

function getOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
