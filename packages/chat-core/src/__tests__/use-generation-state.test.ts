import { describe, expect, it } from 'vitest'
import {
  canStopActiveGeneration,
  hasVisibleGenerationProgress,
  isGenerationStalled,
} from '@chat/shared/logic/chat-generation-core'

describe('generation stop eligibility', () => {
  it('allows stop while streaming', () => {
    expect(
      canStopActiveGeneration({
        message: { id: 'a1', role: 'assistant', status: 'streaming', text: '' },
        isStalled: false,
      }),
    ).toBe(true)
  })

  it('blocks stop on empty pending until stalled', () => {
    expect(
      canStopActiveGeneration({
        message: { id: 'a1', role: 'assistant', status: 'pending', text: '' },
        isStalled: false,
      }),
    ).toBe(false)
  })

  it('allows force stop after stall', () => {
    expect(
      canStopActiveGeneration({
        message: { id: 'a1', role: 'assistant', status: 'pending', text: '' },
        isStalled: true,
      }),
    ).toBe(true)
  })

  it('treats tool activity as visible progress', () => {
    expect(
      hasVisibleGenerationProgress({
        id: 'a1',
        role: 'assistant',
        status: 'pending',
        text: '',
        parts: [
          {
            type: 'tool-call',
            toolCallId: 'tc1',
            toolName: 'search',
            args: {},
          },
        ],
      }),
    ).toBe(true)
  })
})

describe('isGenerationStalled', () => {
  it('becomes stalled at threshold', () => {
    expect(
      isGenerationStalled({
        lastProgressAt: 1_000,
        now: 21_000,
        thresholdMs: 20_000,
      }),
    ).toBe(true)
  })
})
