/**
 * Maps raw API / client errors to short, user-facing copy.
 * Rules are checked top-to-bottom; first match wins.
 */

export type UserFacingErrorCategory =
  | 'auth'
  | 'network'
  | 'rate_limit'
  | 'model'
  | 'attachment'
  | 'billing'
  | 'content'
  | 'generation'
  | 'queue'
  | 'hidden'

type UserFacingErrorRule = {
  id: string
  category: UserFacingErrorCategory
  matches: (message: string, lower: string) => boolean
  format: string | ((message: string) => string)
}

export const CHAT_INLINE_ERROR_FALLBACK = 'Something went wrong. Try again.'
export const CHAT_SEND_ERROR_FALLBACK = 'Unable to send right now. Try again.'
export const CHAT_GENERATION_FAILED_FALLBACK = 'This response could not be generated.'
export const CHAT_STOP_GENERATION_FAILED_MESSAGE =
  'Could not stop generation. Try again in a moment.'
export const CHAT_PROJECT_ASSIGN_FAILED_MESSAGE =
  'Could not add this chat to the selected project'
export const CHAT_QUEUE_FULL_MESSAGE =
  'Wait for the current reply to finish, or stop it before sending another.'
export const CHAT_FILES_STILL_UPLOADING_MESSAGE =
  'Files are still uploading. Wait a moment and try again.'

const HIDDEN_TECHNICAL_RULES: UserFacingErrorRule[] = [
  {
    id: 'convex-validation',
    category: 'hidden',
    matches: (_message, lower) =>
      lower.includes('argumentvalidationerror') ||
      lower.includes('extra field') ||
      lower.includes('validator:') ||
      lower.includes('at handler') ||
      lower.includes('convex ['),
    format: '',
  },
  {
    id: 'json-payload',
    category: 'hidden',
    matches: (message) => message.startsWith('{') || message.startsWith('['),
    format: '',
  },
  {
    id: 'generic-server',
    category: 'hidden',
    matches: (_message, lower) =>
      lower === 'server error' ||
      lower === 'unknown error occurred' ||
      lower === 'internal server error',
    format: '',
  },
]

const USER_FACING_ERROR_RULES: UserFacingErrorRule[] = [
  ...HIDDEN_TECHNICAL_RULES,
  {
    id: 'no-model-selected',
    category: 'model',
    matches: (_message, lower) => lower === 'no model selected',
    format: 'Select a model first.',
  },
  {
    id: 'queue-full',
    category: 'queue',
    matches: (_message, lower) => lower.includes('queue full'),
    format: CHAT_QUEUE_FULL_MESSAGE,
  },
  {
    id: 'files-uploading',
    category: 'attachment',
    matches: (_message, lower) => lower.includes('files are still uploading'),
    format: CHAT_FILES_STILL_UPLOADING_MESSAGE,
  },
  {
    id: 'stop-generation',
    category: 'generation',
    matches: (_message, lower) => lower.includes('could not stop generation'),
    format: CHAT_STOP_GENERATION_FAILED_MESSAGE,
  },
  {
    id: 'generation-stopped',
    category: 'generation',
    matches: (_message, lower) =>
      lower.includes('stopped by user') || lower === 'generation stopped.',
    format: 'Generation stopped.',
  },
  {
    id: 'project-assign-failed',
    category: 'generation',
    matches: (_message, lower) => lower.includes('could not add this chat to the selected project'),
    format: CHAT_PROJECT_ASSIGN_FAILED_MESSAGE,
  },
  {
    id: 'project-create-failed',
    category: 'generation',
    matches: (_message, lower) => lower.includes('could not create project'),
    format: 'Could not create the project right now. Try again.',
  },
  {
    id: 'offline',
    category: 'network',
    matches: (_message, lower) =>
      lower.includes('offline') ||
      lower.includes('failed to fetch') ||
      lower.includes('network request failed') ||
      lower.includes('network error') ||
      lower.includes('err_internet_disconnected'),
    format: 'Check your connection and try again.',
  },
  {
    id: 'auth-required',
    category: 'auth',
    matches: (_message, lower) =>
      lower.includes('not authenticated') ||
      lower.includes('must be logged in') ||
      lower.includes('sign in') ||
      lower === 'unauthorized',
    format: 'Sign in to continue.',
  },
  {
    id: 'invalid-api-key',
    category: 'auth',
    matches: (_message, lower) =>
      lower.includes('invalid api key') ||
      lower.includes('incorrect api key') ||
      lower.includes('api key provided') ||
      lower.includes('authentication failed') ||
      lower.includes('invalid authentication') ||
      (lower.includes('apikey') && lower.includes('required')),
    format: 'The API key for this model is missing or invalid. Check your provider settings.',
  },
  {
    id: 'rate-limit',
    category: 'rate_limit',
    matches: (message, lower) =>
      lower.includes('429') ||
      lower.includes('rate limit') ||
      lower.includes('rate-limited') ||
      lower.includes('too many requests') ||
      lower.includes('maxretriesexceeded') ||
      lower.includes('failed after 3 attempts') ||
      lower.includes('retry shortly') ||
      lower.includes('overloaded'),
    format: 'This model is busy. Try again in a moment.',
  },
  {
    id: 'service-unavailable',
    category: 'network',
    matches: (_message, lower) =>
      lower.includes('503') ||
      lower.includes('502') ||
      lower.includes('504') ||
      lower.includes('service unavailable') ||
      lower.includes('bad gateway') ||
      lower.includes('gateway timeout') ||
      lower.includes('temporarily unavailable'),
    format: 'The model provider is temporarily unavailable. Try again shortly.',
  },
  {
    id: 'timeout',
    category: 'network',
    matches: (_message, lower) =>
      lower.includes('timeout') ||
      lower.includes('timed out') ||
      lower.includes('deadline exceeded'),
    format: 'The model took too long to respond. Try again.',
  },
  {
    id: 'context-length',
    category: 'model',
    matches: (_message, lower) =>
      lower.includes('context length') ||
      lower.includes('maximum context') ||
      lower.includes('token limit') ||
      lower.includes('max tokens') ||
      lower.includes('context window') ||
      lower.includes('prompt is too long') ||
      lower.includes('too many tokens') ||
      lower.includes('input is too long'),
    format: 'This chat is too long for the selected model. Start a new chat or pick another model.',
  },
  {
    id: 'billing-quota',
    category: 'billing',
    matches: (_message, lower) =>
      lower.includes('insufficient_quota') ||
      lower.includes('insufficient quota') ||
      lower.includes('billing') ||
      lower.includes('exceeded your current quota') ||
      lower.includes('usage limit') ||
      lower.includes('out of credits') ||
      lower.includes('payment required'),
    format: 'You have hit a usage limit for this model. Try again later or switch models.',
  },
  {
    id: 'model-access',
    category: 'model',
    matches: (message) => extractAccessDeniedModel(message) !== null,
    format: (message) => {
      const model = extractAccessDeniedModel(message)
      return model
        ? `${model} is not available on your provider plan.`
        : 'This model is not available on your provider plan.'
    },
  },
  {
    id: 'content-policy',
    category: 'content',
    matches: (_message, lower) =>
      lower.includes('content policy') ||
      lower.includes('content filter') ||
      lower.includes('safety') ||
      lower.includes('moderation') ||
      lower.includes('flagged') ||
      lower.includes('violat') ||
      lower.includes('blocked by'),
    format: "This request couldn't be completed because of content restrictions.",
  },
  {
    id: 'empty-document',
    category: 'attachment',
    matches: (_message, lower) =>
      (lower.includes('no pages') && lower.includes('document')) ||
      lower.includes('document has no pages'),
    format: 'That file could not be read. Try a different attachment.',
  },
  {
    id: 'file-too-large',
    category: 'attachment',
    matches: (_message, lower) =>
      lower.includes('file too large') ||
      lower.includes('payload too large') ||
      lower.includes('entity too large') ||
      lower.includes('request body larger'),
    format: 'That file is too large. Try a smaller file.',
  },
  {
    id: 'upload-failed',
    category: 'attachment',
    matches: (_message, lower) =>
      lower.includes('upload failed') ||
      lower.includes('failed to upload'),
    format: 'A file could not be uploaded. Try again or pick a different file.',
  },
  {
    id: 'model-could-not-complete',
    category: 'generation',
    matches: (_message, lower) =>
      lower.includes('could not complete this response') ||
      lower.includes('failed to generate'),
    format: CHAT_GENERATION_FAILED_FALLBACK,
  },
]

export function normalizeRawErrorMessage(message: string): string {
  return message
    .replace(/\s*\[Request ID:[^\]]+\]\s*/gi, ' ')
    .replace(/^Error:\s*/i, '')
    .replace(/Last error:\s*/gi, '')
    .replace(/Provider returned error/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchUserFacingError(
  rawMessage: string,
  fallback: string,
): string {
  const normalized = normalizeRawErrorMessage(rawMessage)
  if (!normalized) {
    return fallback
  }

  const lower = normalized.toLowerCase()

  for (const rule of USER_FACING_ERROR_RULES) {
    if (!rule.matches(normalized, lower)) {
      continue
    }

    if (rule.category === 'hidden') {
      return fallback
    }

    return typeof rule.format === 'function' ? rule.format(normalized) : rule.format
  }

  return normalized
}

export function extractAccessDeniedModel(error: string): string | null {
  const match =
    /does not yet include access to ([\w.-]+)/i.exec(error) ||
    /does not include access to ([\w.-]+)/i.exec(error)

  const model = match?.[1]?.trim().replace(/[.!,]+$/, '')
  return model || null
}
