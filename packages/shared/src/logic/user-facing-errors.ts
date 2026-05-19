/** User-safe error messages for web and mobile chat UI. */

import {
  CHAT_GENERATION_FAILED_FALLBACK,
  CHAT_INLINE_ERROR_FALLBACK,
  CHAT_SEND_ERROR_FALLBACK,
  CHAT_STOP_GENERATION_FAILED_MESSAGE,
  CHAT_PROJECT_ASSIGN_FAILED_MESSAGE,
  matchUserFacingError,
  normalizeRawErrorMessage,
} from './user-facing-error-catalog'

export {
  CHAT_GENERATION_FAILED_FALLBACK,
  CHAT_INLINE_ERROR_FALLBACK,
  CHAT_SEND_ERROR_FALLBACK,
  CHAT_STOP_GENERATION_FAILED_MESSAGE,
  CHAT_PROJECT_ASSIGN_FAILED_MESSAGE,
  CHAT_QUEUE_FULL_MESSAGE,
  CHAT_FILES_STILL_UPLOADING_MESSAGE,
} from './user-facing-error-catalog'

const MAX_USER_MESSAGE_LENGTH = 160

export function resolveChatInlineErrorMessage(message: string | undefined | null): string {
  const trimmed = message?.trim()
  return trimmed || CHAT_INLINE_ERROR_FALLBACK
}

export function extractErrorMessageFromUnknown(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; data?: unknown }
    if (typeof record.data === 'string') {
      return record.data
    }
    if (
      record.data &&
      typeof record.data === 'object' &&
      'message' in record.data &&
      typeof (record.data as { message: unknown }).message === 'string'
    ) {
      return (record.data as { message: string }).message
    }
    if (typeof record.message === 'string') {
      return record.message
    }
  }
  return ''
}

export function formatUserFacingError(
  error: unknown,
  fallback = CHAT_SEND_ERROR_FALLBACK,
): string {
  const raw = extractErrorMessageFromUnknown(error)
  if (!raw.trim()) {
    return fallback
  }
  return sanitizeUserFacingMessage(raw, { fallback }) || fallback
}

export function formatMessageFailureNote(
  note: string | undefined,
  kind: 'stopped' | 'error' = 'error',
): string {
  if (kind === 'stopped') {
    return 'Generation stopped.'
  }

  if (!note?.trim()) {
    return CHAT_GENERATION_FAILED_FALLBACK
  }

  return (
    sanitizeUserFacingMessage(note, {
      fallback: CHAT_GENERATION_FAILED_FALLBACK,
    }) || CHAT_GENERATION_FAILED_FALLBACK
  )
}

function sanitizeUserFacingMessage(
  message: string,
  options: { fallback: string },
): string {
  const mapped = matchUserFacingError(message, options.fallback)
  if (mapped === options.fallback) {
    return mapped
  }

  const normalized = normalizeRawErrorMessage(message)
  if (mapped !== normalized) {
    return mapped
  }

  if (normalized.length > MAX_USER_MESSAGE_LENGTH) {
    return options.fallback
  }

  return mapped
}
