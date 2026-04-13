import { describe, expect, it } from 'vitest'
import { buildActivitySteps } from './message-activity-utils'

describe('buildActivitySteps', () => {
  it('collapses repeated reasoning and repeated calls to the same tool', () => {
    const steps = buildActivitySteps(
      [
        { type: 'reasoning', text: 'First pass' },
        {
          type: 'tool-call',
          toolCallId: 'tool-1',
          toolName: 'quran_source_lookup',
          state: 'running',
        },
        {
          type: 'tool-result',
          toolCallId: 'tool-1',
          toolName: 'quran_source_lookup',
          result: {
            results: [
              {
                url: 'https://example.com/a',
                title: 'Source A',
                snippet: 'Alpha',
              },
            ],
          },
        },
        { type: 'reasoning', text: 'Second pass' },
        {
          type: 'tool-call',
          toolCallId: 'tool-2',
          toolName: 'quran_source_lookup',
          state: 'complete',
        },
        {
          type: 'tool-result',
          toolCallId: 'tool-2',
          toolName: 'quran_source_lookup',
          result: {
            results: [
              {
                url: 'https://example.com/a',
                title: 'Source A',
                snippet: 'Alpha duplicate',
              },
              {
                url: 'https://example.com/b',
                title: 'Source B',
                snippet: 'Beta',
              },
            ],
          },
        },
      ],
      'done',
    )

    expect(steps).toHaveLength(2)
    expect(steps[0]).toMatchObject({
      kind: 'reasoning',
      count: 2,
      body: 'First pass\n\nSecond pass',
    })
    expect(steps[1]).toMatchObject({
      kind: 'tool',
      toolName: 'quran_source_lookup',
      title: 'Quran Source',
      count: 2,
      status: 'complete',
    })
    expect(steps[1]).toMatchObject({
      sources: [
        expect.objectContaining({ url: 'https://example.com/a' }),
        expect.objectContaining({ url: 'https://example.com/b' }),
      ],
    })
  })

  it('prefers visible reasoning text over an earlier redacted placeholder', () => {
    const steps = buildActivitySteps(
      [{ type: 'redacted-reasoning' }, { type: 'reasoning', text: 'Visible reasoning' }],
      'done',
    )

    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      kind: 'reasoning',
      count: 2,
      body: 'Visible reasoning',
      redacted: false,
    })
  })
})
