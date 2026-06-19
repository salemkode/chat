import {
  RATE_LIMIT_KINDS,
  RATE_LIMIT_SCOPES,
  type RateLimitPolicy,
} from '@chat/core/admin-types'
import { z } from 'zod'

/**
 * Small runtime parsers for untrusted/external values. Each one validates with a
 * zod schema so the shape is actually checked (not just asserted via a cast).
 */

const uploadResponseSchema = z.object({
  storageId: z.string().min(1),
})

export function parseUploadResponse(value: unknown): { storageId: string } {
  return uploadResponseSchema.parse(value)
}

const fileReaderStringSchema = z.string()

export function readFileReaderResultAsString(result: string | ArrayBuffer | null) {
  // Throws a clear error if the FileReader did not produce a data URL string.
  return fileReaderStringSchema.parse(result)
}

export function getRequiredEnv(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing ${key} environment variable`)
  }

  return value
}

const rateLimitScopeSchema = z.enum(RATE_LIMIT_SCOPES)

export function parseRateLimitScope(value: unknown): RateLimitPolicy['scope'] {
  return rateLimitScopeSchema.parse(value)
}

const rateLimitKindSchema = z.enum(RATE_LIMIT_KINDS)

export function parseRateLimitKind(value: unknown): RateLimitPolicy['kind'] {
  return rateLimitKindSchema.parse(value)
}
