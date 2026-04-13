import { describe, expect, it } from 'vitest'
import { estimateCostFromProfile, resolvePricingRates } from './pricingTier'

describe('resolvePricingRates', () => {
  it('uses flat rates when tiers are absent', () => {
    expect(resolvePricingRates({ inputPer1M: 1, outputPer1M: 2 }, 500_000)).toEqual({
      inputPer1M: 1,
      outputPer1M: 2,
    })
  })

  it('picks first bracket where input is within maxContextTokens', () => {
    const pricing = {
      inputPer1M: 99,
      outputPer1M: 99,
      tiers: [
        { maxContextTokens: 200_000, inputPer1M: 1, outputPer1M: 10 },
        { maxContextTokens: 1_000_000, inputPer1M: 2, outputPer1M: 20 },
      ],
    }
    expect(resolvePricingRates(pricing, 100_000)).toEqual({
      inputPer1M: 1,
      outputPer1M: 10,
    })
    expect(resolvePricingRates(pricing, 200_000)).toEqual({
      inputPer1M: 1,
      outputPer1M: 10,
    })
    expect(resolvePricingRates(pricing, 500_000)).toEqual({
      inputPer1M: 2,
      outputPer1M: 20,
    })
  })

  it('uses last tier when input exceeds all maxContextTokens', () => {
    const pricing = {
      inputPer1M: 0,
      outputPer1M: 0,
      tiers: [
        { maxContextTokens: 100, inputPer1M: 1, outputPer1M: 1 },
        { maxContextTokens: 200, inputPer1M: 3, outputPer1M: 3 },
      ],
    }
    expect(resolvePricingRates(pricing, 999_999)).toEqual({
      inputPer1M: 3,
      outputPer1M: 3,
    })
  })
})

describe('estimateCostFromProfile', () => {
  it('returns null without pricing', () => {
    expect(estimateCostFromProfile(undefined, 1e6, 1e6)).toBeNull()
  })

  it('applies tiered rates to cost', () => {
    const pricing = {
      inputPer1M: 0,
      outputPer1M: 0,
      tiers: [
        { maxContextTokens: 500_000, inputPer1M: 10, outputPer1M: 0 },
        { maxContextTokens: 2_000_000, inputPer1M: 20, outputPer1M: 0 },
      ],
    }
    const cost = estimateCostFromProfile(pricing, 400_000, 0)
    expect(cost).toBe(4)
  })
})
