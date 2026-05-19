import { describe, expect, it } from 'bun:test'
import {
  formatMessageFailureNote,
  formatUserFacingError,
} from './user-facing-errors'

describe('formatUserFacingError', () => {
  it('maps common send failures to short copy', () => {
    expect(formatUserFacingError(new Error('No model selected'))).toBe(
      'Select a model first.',
    )
    expect(
      formatUserFacingError(
        new Error('Provider returned error [Request ID: abc123] 429 rate limit'),
      ),
    ).toBe('This model is busy. Try again shortly.')
  })

  it('hides technical validation errors', () => {
    expect(
      formatUserFacingError(
        new Error(
          'ArgumentValidationError: Object contains extra field `searchMode`',
        ),
      ),
    ).toBe('Unable to send right now. Try again.')
  })

  it('falls back for very long messages', () => {
    const long = 'x'.repeat(200)
    expect(formatUserFacingError(new Error(long))).toBe(
      'Unable to send right now. Try again.',
    )
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
})
