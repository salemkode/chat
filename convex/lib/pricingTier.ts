export type SelectionPricing = {
  inputPer1M: number
  outputPer1M: number
  currency?: string
  tiers?: Array<{
    maxContextTokens: number
    inputPer1M: number
    outputPer1M: number
  }>
}

/**
 * Bracket pricing by estimated prompt size: first tier where input <= maxContextTokens,
 * else the highest maxContextTokens tier (sorted ascending).
 */
export function resolvePricingRates(
  pricing: SelectionPricing | undefined,
  estimatedInputTokens: number,
): { inputPer1M: number; outputPer1M: number } {
  if (!pricing) {
    return { inputPer1M: 0, outputPer1M: 0 }
  }
  const tiers = pricing.tiers
  if (!tiers?.length) {
    return { inputPer1M: pricing.inputPer1M, outputPer1M: pricing.outputPer1M }
  }
  const sorted = [...tiers].sort((a, b) => a.maxContextTokens - b.maxContextTokens)
  for (const tier of sorted) {
    if (estimatedInputTokens <= tier.maxContextTokens) {
      return { inputPer1M: tier.inputPer1M, outputPer1M: tier.outputPer1M }
    }
  }
  const last = sorted[sorted.length - 1]
  return { inputPer1M: last.inputPer1M, outputPer1M: last.outputPer1M }
}

export function estimateCostFromProfile(
  pricing: SelectionPricing | undefined,
  inputTokens: number,
  outputTokens: number,
): number | null {
  if (!pricing) return null
  const rates = resolvePricingRates(pricing, inputTokens)
  return (
    (inputTokens / 1_000_000) * rates.inputPer1M + (outputTokens / 1_000_000) * rates.outputPer1M
  )
}
