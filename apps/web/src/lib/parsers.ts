import {
  isRateLimitKind,
  isRateLimitScope,
  type RateLimitPolicy,
} from '@chat/shared/admin-types'

export function parseUploadResponse(value: unknown): { storageId: string } {
  if (!isRecord(value) || typeof value.storageId !== 'string') {
    throw new Error('Upload response is missing storageId')
  }

  return { storageId: value.storageId }
}

export function readFileReaderResultAsString(result: string | ArrayBuffer | null) {
  if (typeof result !== 'string') {
    throw new Error('Expected FileReader to produce a data URL string')
  }

  return result
}

export function getRequiredEnv(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing ${key} environment variable`)
  }

  return value
}

export function parseRateLimitScope(value: unknown): RateLimitPolicy['scope'] {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
