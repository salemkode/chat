import { describe, expect, it } from 'vitest'
import { resolveStudioRawPrice } from './modelStudioCost'

describe('resolveStudioRawPrice', () => {
  it('prefers intelligence index run cost when present', () => {
    expect(
      resolveStudioRawPrice({
        intelligenceIndexRunCostUsd: 42.5,
        pricing: {
          inputPer1M: 1,
          outputPer1M: 2,
        },
      }),
    ).toBe(42.5)
  })

  it('falls back to profile pricing estimate', () => {
    expect(
      resolveStudioRawPrice({
        pricing: {
          inputPer1M: 1,
          outputPer1M: 2,
        },
      }),
    ).toBeCloseTo(0.0029, 5)
  })

  it('returns zero without profile data', () => {
    expect(resolveStudioRawPrice(null)).toBe(0)
  })
})
