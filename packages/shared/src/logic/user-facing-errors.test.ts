import { describe, expect, it } from 'bun:test'
import {
  CHAT_GENERATION_FAILED_FALLBACK,
  CHAT_QUEUE_FULL_MESSAGE,
  CHAT_SEND_ERROR_FALLBACK,
  CHAT_STOP_GENERATION_FAILED_MESSAGE,
  formatMessageFailureNote,
  formatUserFacingError,
  resolveChatInlineErrorMessage,
} from './user-facing-errors'

describe('formatUserFacingError', () => {
  it('maps stop failures to shared copy', () => {
    expect(formatUserFacingError(new Error('Could not stop generation'))).toBe(
      CHAT_STOP_GENERATION_FAILED_MESSAGE,
    )
  })

  it('maps common send failures to short copy', () => {
    expect(formatUserFacingError(new Error('No model selected'))).toBe(
      'Select a model first.',
    )
    expect(
      formatUserFacingError(
        new Error('Provider returned error [Request ID: abc123] 429 rate limit'),
      ),
    ).toBe('This model is busy. Try again in a moment.')
  })

  it('maps auth and network errors', () => {
    expect(formatUserFacingError(new Error('Not authenticated'))).toBe(
      'Sign in to continue.',
    )
    expect(formatUserFacingError(new Error('Failed to fetch'))).toBe(
      'Check your connection and try again.',
    )
  })

  it('maps context and billing errors', () => {
    expect(
      formatUserFacingError(new Error('maximum context length exceeded for this model')),
    ).toBe(
      'This chat is too long for the selected model. Start a new chat or pick another model.',
    )
    expect(formatUserFacingError(new Error('You exceeded your current quota'))).toBe(
      'You have hit a usage limit for this model. Try again later or switch models.',
    )
  })

  it('maps queue and timeout errors', () => {
    expect(formatUserFacingError(new Error('Queue full (3). Wait or stop'))).toBe(
      CHAT_QUEUE_FULL_MESSAGE,
    )
    expect(formatUserFacingError(new Error('Request timed out after 60s'))).toBe(
      'The model took too long to respond. Try again.',
    )
  })

  it('maps content policy errors', () => {
    expect(formatUserFacingError(new Error('Request blocked by content policy'))).toBe(
      "This request couldn't be completed because of content restrictions.",
    )
  })

  it('hides technical validation errors', () => {
    expect(
      formatUserFacingError(
        new Error(
          'ArgumentValidationError: Object contains extra field `searchMode`',
        ),
      ),
    ).toBe(CHAT_SEND_ERROR_FALLBACK)
  })

  it('passes through short user-friendly attachment copy', () => {
    expect(formatUserFacingError(new Error("GPT-4o doesn't support file attachments"))).toBe(
      "GPT-4o doesn't support file attachments",
    )
  })

  it('falls back for very long messages', () => {
    const long = 'x'.repeat(200)
    expect(formatUserFacingError(new Error(long))).toBe(CHAT_SEND_ERROR_FALLBACK)
  })
})

describe('resolveChatInlineErrorMessage', () => {
  it('uses fallback for empty input', () => {
    expect(resolveChatInlineErrorMessage('  ')).toBe('Something went wrong. Try again.')
  })
})

describe('formatMessageFailureNote', () => {
  it('returns stopped copy', () => {
    expect(formatMessageFailureNote(undefined, 'stopped')).toBe('Generation stopped.')
  })

  it('sanitizes provider failure notes', () => {
    expect(
      formatMessageFailureNote(
        'Provider returned error: does not yet include access to gpt-4.1.',
      ),
    ).toBe('gpt-4.1 is not available on your provider plan.')
  })

  it('uses generation fallback for empty notes', () => {
    expect(formatMessageFailureNote(undefined, 'error')).toBe(CHAT_GENERATION_FAILED_FALLBACK)
  })
})
