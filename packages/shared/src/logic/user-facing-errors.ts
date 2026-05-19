/** Short, user-safe error copy for web and mobile chat UI. */

const DEFAULT_SEND_ERROR = 'Unable to send right now. Try again.'
const DEFAULT_FAILURE_NOTE = 'This response could not be generated.'
const MAX_USER_MESSAGE_LENGTH = 160

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
  fallback = DEFAULT_SEND_ERROR,
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
    return DEFAULT_FAILURE_NOTE
  }

  return (
    sanitizeUserFacingMessage(note, {
      fallback: DEFAULT_FAILURE_NOTE,
    }) || DEFAULT_FAILURE_NOTE
  )
}

function sanitizeUserFacingMessage(
  message: string,
  options: { fallback: string },
): string {
  const normalized = message
    .replace(/\s*\[Request ID:[^\]]+\]\s*/gi, ' ')
    .replace(/^Error:\s*/i, '')
    .replace(/Last error:\s*/gi, '')
    .replace(/Provider returned error/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return ''
  }

  const mapped = mapKnownErrorMessage(normalized)
  if (mapped) {
    return mapped
  }

  if (shouldHideTechnicalMessage(normalized)) {
    return ''
  }

  if (normalized.length > MAX_USER_MESSAGE_LENGTH) {
    return options.fallback
  }

  return normalized
}

function mapKnownErrorMessage(message: string): string | null {
  const lower = message.toLowerCase()

  if (message === 'No model selected') {
    return 'Select a model first.'
  }

  if (lower === 'server error' || lower === 'unknown error occurred') {
    return null
  }

  if (
    lower.includes('offline') ||
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('network error')
  ) {
    return 'Check your connection and try again.'
  }

  if (
    lower.includes('unauthorized') ||
    lower.includes('not authenticated') ||
    lower.includes('must be logged in')
  ) {
    return 'Sign in to continue.'
  }

  if (isRetryableProviderRateLimit(message)) {
    return 'This model is busy. Try again shortly.'
  }

  const accessDeniedModel = extractAccessDeniedModel(message)
  if (accessDeniedModel) {
    return `${accessDeniedModel} is not available on your provider plan.`
  }

  if (lower.includes('stopped by user') || lower === 'generation stopped.') {
    return 'Generation stopped.'
  }

  if (lower.includes('could not stop generation')) {
    return 'Could not stop generation. Try again.'
  }

  if (lower.includes('no pages') && lower.includes('document')) {
    return 'That file could not be read. Try a different attachment.'
  }

  return null
}

function shouldHideTechnicalMessage(message: string): boolean {
  const lower = message.toLowerCase()

  if (
    lower.includes('argumentvalidationerror') ||
    lower.includes('extra field') ||
    lower.includes('validator:') ||
    lower.includes('at handler') ||
    lower.includes('convex [')
  ) {
    return true
  }

  if (message.startsWith('{') || message.startsWith('[')) {
    return true
  }

  return false
}

function extractAccessDeniedModel(error: string) {
  const match =
    /does not yet include access to ([\w.-]+)/i.exec(error) ||
    /does not include access to ([\w.-]+)/i.exec(error)

  const model = match?.[1]?.trim().replace(/[.!,]+$/, '')
  return model || null
}

function isRetryableProviderRateLimit(error: string) {
  const normalized = error.toLowerCase()
  return (
    normalized.includes('429') ||
    normalized.includes('rate-limited') ||
    normalized.includes('rate limit') ||
    normalized.includes('maxretriesexceeded') ||
    normalized.includes('failed after 3 attempts') ||
    normalized.includes('retry shortly')
  )
}
