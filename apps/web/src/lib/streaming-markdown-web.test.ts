import { describe, expect, it } from 'vitest'
import { segmentStreamingMarkdownWeb } from './streaming-markdown-web'

describe('segmentStreamingMarkdownWeb', () => {
  it('keeps an incomplete paragraph in the streaming tail', () => {
    const segments = segmentStreamingMarkdownWeb('Hello world')

    expect(segments.committedBlocks).toEqual([])
    expect(segments.streamTail).toBe('Hello world')
    expect(segments.hasUnstableTail).toBe(true)
  })

  it('commits a paragraph after a blank line boundary', () => {
    const segments = segmentStreamingMarkdownWeb('Hello world\n\n')

    expect(segments.committedBlocks).toEqual(['Hello world\n\n'])
    expect(segments.streamTail).toBe('')
    expect(segments.hasUnstableTail).toBe(false)
  })

  it('keeps an unclosed fenced block in the streaming tail', () => {
    const input = ['Before', '```ts', 'const a = 1'].join('\n')
    const segments = segmentStreamingMarkdownWeb(input)

    expect(segments.committedBlocks).toEqual(['Before\n'])
    expect(segments.streamTail).toBe('```ts\nconst a = 1')
    expect(segments.hasUnstableTail).toBe(true)
  })

  it('commits a fenced block once the closing fence arrives', () => {
    const input = ['```ts', 'const a = 1', '```'].join('\n')
    const segments = segmentStreamingMarkdownWeb(input)

    expect(segments.committedBlocks).toEqual([input])
    expect(segments.streamTail).toBe('')
    expect(segments.hasUnstableTail).toBe(false)
  })

  it('commits a closed mermaid fence as one stable block for Streamdown rendering', () => {
    const input = ['```mermaid', 'graph TD', '  A-->B', '```'].join('\n')
    const segments = segmentStreamingMarkdownWeb(input)

    expect(segments.committedBlocks).toEqual([input])
    expect(segments.streamTail).toBe('')
    expect(segments.hasUnstableTail).toBe(false)
  })

  it('keeps an incomplete mermaid fence in the streaming tail', () => {
    const input = ['```mermaid', 'graph TD'].join('\n')
    const segments = segmentStreamingMarkdownWeb(input)

    expect(segments.committedBlocks).toEqual([])
    expect(segments.streamTail).toBe(input)
    expect(segments.hasUnstableTail).toBe(true)
  })

  it.each([
    ['table', ['| a | b |', '| - | - |', '| 1 |'].join('\n')],
    ['list', ['- first', '- second'].join('\n')],
    ['blockquote', ['> quoted', '> partial'].join('\n')],
  ])('keeps an incomplete %s block in the streaming tail', (_label, input) => {
    const segments = segmentStreamingMarkdownWeb(input)

    expect(segments.committedBlocks).toEqual([])
    expect(segments.streamTail).toBe(input)
    expect(segments.hasUnstableTail).toBe(true)
  })

  it('commits the previous paragraph when a new block starts', () => {
    const input = ['Hello world', '# Heading'].join('\n')
    const segments = segmentStreamingMarkdownWeb(input)

    expect(segments.committedBlocks).toEqual(['Hello world\n'])
    expect(segments.streamTail).toBe('# Heading')
    expect(segments.hasUnstableTail).toBe(true)
  })
})
