import { describe, expect, it } from 'vitest'
import { segmentStreamingMarkdown } from './streaming-markdown-segments'

describe('streaming-markdown-segments', () => {
  it('keeps an unclosed code fence in stream tail', () => {
    const input = ['Before', '```ts', 'const a = 1'].join('\n')
    const segments = segmentStreamingMarkdown(input)

    expect(segments.stableMarkdown).toBe('Before\n')
    expect(segments.streamTail).toBe('```ts\nconst a = 1')
    expect(segments.hasUnstableTail).toBe(true)
  })

  it('promotes a closed code fence into stable markdown', () => {
    const input = ['Before', '```ts', 'const a = 1', '```'].join('\n')
    const segments = segmentStreamingMarkdown(input)

    expect(segments.stableMarkdown).toBe(input)
    expect(segments.streamTail).toBe('')
    expect(segments.hasUnstableTail).toBe(false)
  })

  it('keeps an incomplete markdown table row in stream tail', () => {
    const input = ['| a | b |', '| - | - |', '| 1 |'].join('\n')
    const segments = segmentStreamingMarkdown(input)

    expect(segments.stableMarkdown).toBe('| a | b |\n| - | - |\n')
    expect(segments.streamTail).toBe('| 1 |')
    expect(segments.hasUnstableTail).toBe(true)
  })

  it('keeps an incomplete list item line in stream tail', () => {
    const input = ['One', '- streaming item'].join('\n')
    const segments = segmentStreamingMarkdown(input)

    expect(segments.stableMarkdown).toBe('One\n')
    expect(segments.streamTail).toBe('- streaming item')
    expect(segments.hasUnstableTail).toBe(true)
  })

  it('keeps an incomplete blockquote line in stream tail', () => {
    const input = ['Intro', '> partial thought'].join('\n')
    const segments = segmentStreamingMarkdown(input)

    expect(segments.stableMarkdown).toBe('Intro\n')
    expect(segments.streamTail).toBe('> partial thought')
    expect(segments.hasUnstableTail).toBe(true)
  })
})
