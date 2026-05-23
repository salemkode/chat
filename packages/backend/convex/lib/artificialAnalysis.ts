export const ARTIFICIAL_ANALYSIS_MODELS_URL =
  'https://artificialanalysis.ai/api/v2/data/llms/models'

const INTELLIGENCE_INDEX_COST_KEYS = [
  'cost_to_run_artificial_analysis_intelligence_index',
  'cost_to_run_intelligence_index',
  'intelligence_index_run_cost',
  'artificial_analysis_intelligence_index_cost',
  'intelligence_index_cost',
] as const

const TOKEN_USAGE_KEYS = [
  'intelligence_index_token_usage',
  'artificial_analysis_intelligence_index_token_usage',
  'token_usage',
] as const

type SelectionPricing = {
  inputPer1M: number
  outputPer1M: number
  currency?: string
}

type TokenUsage = {
  inputTokens: number
  reasoningTokens: number
  answerTokens: number
}

export type ArtificialAnalysisModel = {
  id: string
  name: string
  slug: string
  creatorSlug?: string
  creatorName?: string
  pricing?: SelectionPricing
  intelligenceIndexRunCostUsd?: number
  benchmarkScores?: Record<string, number>
  latencyStats?: {
    p50Ms: number
    p95Ms: number
  }
}

export type CatalogModelMatchInput = {
  modelId: string
  displayName: string
  providerName?: string
  providerType?: string
  artificialAnalysisId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[:/\\]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function modelIdVariants(modelId: string): string[] {
  const normalized = normalizeKey(modelId)
  const parts = normalized.split('-').filter(Boolean)
  const variants = new Set<string>([normalized])
  if (parts.length > 1) {
    variants.add(parts[parts.length - 1] ?? normalized)
    variants.add(parts.slice(1).join('-'))
  }
  const slashParts = modelId.split('/').filter(Boolean)
  if (slashParts.length > 1) {
    variants.add(normalizeKey(slashParts[slashParts.length - 1] ?? modelId))
    variants.add(normalizeKey(slashParts.slice(1).join('-')))
  }
  return [...variants]
}

function readPricing(pricingValue: unknown): SelectionPricing | undefined {
  if (!isRecord(pricingValue)) {
    return undefined
  }
  const inputPer1M = readNumber(pricingValue.price_1m_input_tokens)
  const outputPer1M = readNumber(pricingValue.price_1m_output_tokens)
  if (inputPer1M === undefined || outputPer1M === undefined) {
    return undefined
  }
  return {
    inputPer1M,
    outputPer1M,
    currency: 'USD',
  }
}

function readTokenUsage(value: unknown): TokenUsage | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const inputTokens =
    readNumber(value.input_tokens) ??
    readNumber(value.input) ??
    readNumber(value.prompt_tokens) ??
    0
  const reasoningTokens =
    readNumber(value.reasoning_tokens) ?? readNumber(value.reasoning) ?? 0
  const answerTokens =
    readNumber(value.answer_tokens) ??
    readNumber(value.output_tokens) ??
    readNumber(value.output) ??
    readNumber(value.completion_tokens) ??
    0
  if (inputTokens <= 0 && reasoningTokens <= 0 && answerTokens <= 0) {
    return undefined
  }
  return { inputTokens, reasoningTokens, answerTokens }
}

function computeIntelligenceIndexRunCost(
  pricing: SelectionPricing,
  usage: TokenUsage,
): number {
  const outputBillable = usage.reasoningTokens + usage.answerTokens
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPer1M +
    (outputBillable / 1_000_000) * pricing.outputPer1M
  )
}

function readCostFromRecord(record: Record<string, unknown>): number | undefined {
  for (const key of INTELLIGENCE_INDEX_COST_KEYS) {
    const direct = readNumber(record[key])
    if (direct !== undefined && direct >= 0) {
      return direct
    }
  }
  return undefined
}

function extractIntelligenceIndexRunCost(
  record: Record<string, unknown>,
  pricing?: SelectionPricing,
): number | undefined {
  const direct = readCostFromRecord(record)
  if (direct !== undefined) {
    return direct
  }

  const evaluations = record.evaluations
  if (isRecord(evaluations)) {
    const fromEvaluations = readCostFromRecord(evaluations)
    if (fromEvaluations !== undefined) {
      return fromEvaluations
    }
  }

  if (!pricing) {
    return undefined
  }

  for (const key of TOKEN_USAGE_KEYS) {
    const usage = readTokenUsage(record[key])
    if (usage) {
      return computeIntelligenceIndexRunCost(pricing, usage)
    }
  }

  if (isRecord(evaluations)) {
    for (const key of TOKEN_USAGE_KEYS) {
      const usage = readTokenUsage(evaluations[key])
      if (usage) {
        return computeIntelligenceIndexRunCost(pricing, usage)
      }
    }
  }

  return undefined
}

function clampBenchmarkScore(value: number): number {
  if (value > 1) {
    return Math.min(1, value / 100)
  }
  return Math.min(1, Math.max(0, value))
}

function readBenchmarkScores(evaluations: Record<string, unknown>): Record<string, number> {
  const scores: Record<string, number> = {}
  const intelligence = readNumber(evaluations.artificial_analysis_intelligence_index)
  const coding = readNumber(evaluations.artificial_analysis_coding_index)
  const math = readNumber(evaluations.artificial_analysis_math_index)
  const analysis =
    readNumber(evaluations.mmlu_pro) ??
    readNumber(evaluations.gpqa) ??
    readNumber(evaluations.artificial_analysis_intelligence_index)

  if (intelligence !== undefined) {
    scores.chat = clampBenchmarkScore(intelligence)
  }
  if (coding !== undefined) {
    scores.coding = clampBenchmarkScore(coding)
  }
  if (math !== undefined) {
    scores.analysis = clampBenchmarkScore(math)
  }
  if (analysis !== undefined) {
    scores.qa = clampBenchmarkScore(analysis)
    if (scores.analysis === undefined) {
      scores.analysis = clampBenchmarkScore(analysis)
    }
  }
  return scores
}

function readLatencyStats(record: Record<string, unknown>):
  | {
      p50Ms: number
      p95Ms: number
    }
  | undefined {
  const ttftSeconds = readNumber(record.median_time_to_first_token_seconds)
  if (ttftSeconds === undefined || ttftSeconds < 0) {
    return undefined
  }
  const p50Ms = Math.round(ttftSeconds * 1000)
  return {
    p50Ms,
    p95Ms: Math.round(p50Ms * 1.5),
  }
}

export function parseArtificialAnalysisModel(value: unknown): ArtificialAnalysisModel | null {
  if (!isRecord(value)) {
    return null
  }
  const id = readString(value.id)
  const name = readString(value.name)
  const slug = readString(value.slug)
  if (!id || !name || !slug) {
    return null
  }

  const creator = value.model_creator
  const creatorSlug = isRecord(creator) ? readString(creator.slug) : undefined
  const creatorName = isRecord(creator) ? readString(creator.name) : undefined
  const pricing = readPricing(value.pricing)
  const intelligenceIndexRunCostUsd = extractIntelligenceIndexRunCost(value, pricing)
  const evaluations = value.evaluations
  const benchmarkScores = isRecord(evaluations) ? readBenchmarkScores(evaluations) : undefined
  const latencyStats = readLatencyStats(value)

  return {
    id,
    name,
    slug,
    creatorSlug,
    creatorName,
    pricing,
    intelligenceIndexRunCostUsd,
    benchmarkScores: benchmarkScores && Object.keys(benchmarkScores).length > 0 ? benchmarkScores : undefined,
    latencyStats,
  }
}

export function parseArtificialAnalysisModelsPayload(payload: unknown): ArtificialAnalysisModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return []
  }
  return payload.data
    .map((entry) => parseArtificialAnalysisModel(entry))
    .filter((entry): entry is ArtificialAnalysisModel => entry !== null)
}

export async function fetchArtificialAnalysisModels(apiKey: string): Promise<ArtificialAnalysisModel[]> {
  const response = await fetch(ARTIFICIAL_ANALYSIS_MODELS_URL, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  })

  if (response.status === 401) {
    throw new Error('Invalid Artificial Analysis API key')
  }
  if (response.status === 429) {
    throw new Error('Artificial Analysis rate limit exceeded')
  }
  if (!response.ok) {
    throw new Error(`Artificial Analysis request failed with ${response.status}`)
  }

  const payload: unknown = await response.json()
  return parseArtificialAnalysisModelsPayload(payload)
}

function scoreCatalogModelMatch(
  model: CatalogModelMatchInput,
  entry: ArtificialAnalysisModel,
): number {
  if (model.artificialAnalysisId && model.artificialAnalysisId === entry.id) {
    return 1000
  }

  const slug = normalizeKey(entry.slug)
  const name = normalizeKey(entry.name)
  const variants = modelIdVariants(model.modelId)
  const displayName = normalizeKey(model.displayName)

  if (variants.includes(slug)) {
    return 900
  }
  if (displayName === name) {
    return 850
  }
  if (variants.some((variant) => variant.endsWith(`-${slug}`) || variant === slug)) {
    return 800
  }
  if (displayName.includes(name) || name.includes(displayName)) {
    return 650
  }

  const providerName = model.providerName ? normalizeKey(model.providerName) : undefined
  const creatorSlug = entry.creatorSlug ? normalizeKey(entry.creatorSlug) : undefined
  const creatorName = entry.creatorName ? normalizeKey(entry.creatorName) : undefined
  const providerType = model.providerType ? normalizeKey(model.providerType) : undefined

  let score = 0
  if (providerName && creatorName && providerName.includes(creatorName)) {
    score += 40
  }
  if (providerType && creatorSlug && (providerType.includes(creatorSlug) || creatorSlug.includes(providerType))) {
    score += 40
  }
  if (variants.some((variant) => slug.includes(variant) || variant.includes(slug))) {
    score += 120
  }
  return score
}

export function matchArtificialAnalysisModel(
  model: CatalogModelMatchInput,
  catalog: ArtificialAnalysisModel[],
): ArtificialAnalysisModel | null {
  let best: ArtificialAnalysisModel | null = null
  let bestScore = 0

  for (const entry of catalog) {
    const score = scoreCatalogModelMatch(model, entry)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore >= 650 ? best : null
}
