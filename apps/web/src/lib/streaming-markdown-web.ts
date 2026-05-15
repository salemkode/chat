import { marked } from 'marked'
import { useEffect, useMemo, useState } from 'react'

export type StreamingMarkdownBlockSegments = {
  committedBlocks: string[]
  streamTail: string
  hasUnstableTail: boolean
}

const STREAM_SEGMENT_THROTTLE_MS = 40
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/

/**
 * Prevent accidental indented "filename labels" from becoming one-line code blocks.
 * Markdown interprets 4+ leading spaces as an indented code block.
 */
export function normalizeStreamingMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }
    if (!/^\s{4,}/.test(line)) {
      continue
    }
    if (!/^['"`]?[A-Za-z0-9_./-]+['"`]?:\s*$/.test(trimmed)) {
      continue
    }

    const nextLine = lines[i + 1]?.trimStart()
    if (nextLine?.startsWith('```') || nextLine?.startsWith('~~~')) {
      lines[i] = trimmed
    }
  }

  return lines.join('\n')
}

function useThrottledText(text: string, isStreaming: boolean) {
  const [throttledText, setThrottledText] = useState(text)

  useEffect(() => {
    if (!isStreaming) {
      setThrottledText(text)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setThrottledText(text)
    }, STREAM_SEGMENT_THROTTLE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isStreaming, text])

  return throttledText
}

function hasClosedFence(raw: string) {
  const lines = raw.split('\n')
  let inFence = false
  let fenceChar = ''
  let fenceLength = 0

  for (const line of lines) {
    const match = line.match(FENCE_PATTERN)
    if (!match) {
      continue
    }

    const marker = match[1]
    const markerChar = marker[0]
    const markerLength = marker.length

    if (!inFence) {
      inFence = true
      fenceChar = markerChar
      fenceLength = markerLength
      continue
    }

    if (markerChar === fenceChar && markerLength >= fenceLength) {
      inFence = false
    }
  }

  return !inFence
}

function isLastTokenStable(token: { type: string; raw: string } | null) {
  if (!token) {
    return false
  }

  switch (token.type) {
    case 'code':
      return hasClosedFence(token.raw)
    case 'heading':
      return token.raw.endsWith('\n')
    case 'paragraph':
    case 'list':
    case 'blockquote':
    case 'table':
      return false
    default:
      return token.raw.length > 0
  }
}

export function segmentStreamingMarkdownWeb(markdown: string): StreamingMarkdownBlockSegments {
  if (markdown.length === 0) {
    return {
      committedBlocks: [],
      streamTail: '',
      hasUnstableTail: false,
    }
  }

  const tokens = marked.lexer(markdown)
  const lastNonSpaceTokenIndex = [...tokens]
    .reverse()
    .findIndex((token) => token.type !== 'space')

  if (lastNonSpaceTokenIndex === -1) {
    return {
      committedBlocks: [],
      streamTail: markdown,
      hasUnstableTail: markdown.length > 0,
    }
  }

  const resolvedLastNonSpaceIndex = tokens.length - 1 - lastNonSpaceTokenIndex
  const lastNonSpaceToken = tokens[resolvedLastNonSpaceIndex]
  const stableTokenCount =
    resolvedLastNonSpaceIndex < tokens.length - 1 || isLastTokenStable(lastNonSpaceToken)
    ? tokens.length
    : resolvedLastNonSpaceIndex
  const committedBlocks: string[] = []
  let currentBlock = ''
  let stableOffset = 0

  for (let index = 0; index < stableTokenCount; index += 1) {
    const token = tokens[index]
    stableOffset += token.raw.length

    if (token.type === 'space') {
      if (currentBlock.length > 0) {
        currentBlock += token.raw
      } else if (committedBlocks.length > 0) {
        committedBlocks[committedBlocks.length - 1] += token.raw
      }
      continue
    }

    if (currentBlock.length > 0) {
      committedBlocks.push(currentBlock)
    }

    currentBlock = token.raw
  }

  if (currentBlock.length > 0) {
    committedBlocks.push(currentBlock)
  }

  const streamTail = markdown.slice(stableOffset)
  return {
    committedBlocks,
    streamTail,
    hasUnstableTail: streamTail.length > 0,
  }
}

export function useStreamingMarkdownWeb(text: string, isStreaming: boolean) {
  const throttledText = useThrottledText(text, isStreaming)
  const normalizedText = useMemo(
    () => normalizeStreamingMarkdown(throttledText),
    [throttledText],
  )

  return useMemo(() => {
    if (!isStreaming) {
      return {
        committedBlocks: normalizedText ? [normalizedText] : [],
        streamTail: '',
        hasUnstableTail: false,
      }
    }

    return segmentStreamingMarkdownWeb(normalizedText)
  }, [isStreaming, normalizedText])
}
