import { describe, expect, it } from 'vitest'
import {
  matchArtificialAnalysisModel,
  parseArtificialAnalysisModel,
  parseArtificialAnalysisModelsPayload,
} from './artificialAnalysis'

describe('parseArtificialAnalysisModel', () => {
  it('parses pricing and direct intelligence index cost', () => {
    const parsed = parseArtificialAnalysisModel({
      id: 'aa-1',
      name: 'o3-mini',
      slug: 'o3-mini',
      model_creator: { name: 'OpenAI', slug: 'openai' },
      evaluations: {
        artificial_analysis_intelligence_index: 62.9,
        artificial_analysis_coding_index: 55.8,
        mmlu_pro: 0.791,
      },
      pricing: {
        price_1m_input_tokens: 1.1,
        price_1m_output_tokens: 4.4,
      },
      cost_to_run_artificial_analysis_intelligence_index: 128.4,
      median_time_to_first_token_seconds: 2.5,
    })

    expect(parsed?.intelligenceIndexRunCostUsd).toBe(128.4)
    expect(parsed?.pricing).toEqual({
      inputPer1M: 1.1,
      outputPer1M: 4.4,
      currency: 'USD',
    })
    expect(parsed?.benchmarkScores?.chat).toBeCloseTo(0.629)
    expect(parsed?.latencyStats?.p50Ms).toBe(2500)
  })

  it('computes intelligence index cost from token usage when needed', () => {
    const parsed = parseArtificialAnalysisModel({
      id: 'aa-2',
      name: 'Test Model',
      slug: 'test-model',
      pricing: {
        price_1m_input_tokens: 1,
        price_1m_output_tokens: 4,
      },
      intelligence_index_token_usage: {
        input_tokens: 2_000_000,
        reasoning_tokens: 500_000,
        answer_tokens: 500_000,
      },
    })

    expect(parsed?.intelligenceIndexRunCostUsd).toBe(6)
  })
})

describe('matchArtificialAnalysisModel', () => {
  const catalog = [
    parseArtificialAnalysisModel({
      id: 'aa-1',
      name: 'Claude Sonnet 4',
      slug: 'claude-sonnet-4',
      model_creator: { name: 'Anthropic', slug: 'anthropic' },
      pricing: { price_1m_input_tokens: 3, price_1m_output_tokens: 15 },
    }),
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  it('matches by stored artificial analysis id first', () => {
    const match = matchArtificialAnalysisModel(
      {
        modelId: 'anthropic/claude-sonnet-4-20250514',
        displayName: 'Different label',
        artificialAnalysisId: 'aa-1',
      },
      catalog,
    )
    expect(match?.id).toBe('aa-1')
  })

  it('matches by slug suffix in model id', () => {
    const match = matchArtificialAnalysisModel(
      {
        modelId: 'anthropic/claude-sonnet-4',
        displayName: 'Claude Sonnet 4',
        providerName: 'Anthropic',
        providerType: 'anthropic',
      },
      catalog,
    )
    expect(match?.slug).toBe('claude-sonnet-4')
  })
})

describe('parseArtificialAnalysisModelsPayload', () => {
  it('reads models from API envelope', () => {
    const models = parseArtificialAnalysisModelsPayload({
      status: 200,
      data: [
        {
          id: 'aa-1',
          name: 'o3-mini',
          slug: 'o3-mini',
          pricing: {
            price_1m_input_tokens: 1.1,
            price_1m_output_tokens: 4.4,
          },
        },
      ],
    })
    expect(models).toHaveLength(1)
    expect(models[0]?.slug).toBe('o3-mini')
  })
})
