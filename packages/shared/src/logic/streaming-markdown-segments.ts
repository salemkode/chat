type StreamingMarkdownSegments = {
  stableMarkdown: string
  streamTail: string
  hasUnstableTail: boolean
}

const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/
const INCOMPLETE_STRUCTURAL_LINE_PATTERN = /^(?:\s*(?:[-*+]|\d+[.)])\s+.*|\s*\|.*|\s*>.*)$/

function getUnclosedFenceOffset(markdown: string): number | null {
  let inFence = false
  let fenceChar = ''
  let fenceLength = 0
  let fenceStartOffset = 0
  let offset = 0
  const lines = markdown.split('\n')

  for (const line of lines) {
    const match = line.match(FENCE_PATTERN)
    if (match) {
      const marker = match[1]
      const markerChar = marker[0]
      const markerLength = marker.length
      if (!inFence) {
        inFence = true
        fenceChar = markerChar
        fenceLength = markerLength
        fenceStartOffset = offset
      } else if (markerChar === fenceChar && markerLength >= fenceLength) {
        inFence = false
      }
    }
    offset += line.length + 1
  }

  return inFence ? fenceStartOffset : null
}

function getIncompleteStructuralLineOffset(markdown: string): number | null {
  if (markdown.length === 0 || markdown.endsWith('\n')) {
    return null
  }
  const lastLineStart = markdown.lastIndexOf('\n') + 1
  const lastLine = markdown.slice(lastLineStart)
  if (!INCOMPLETE_STRUCTURAL_LINE_PATTERN.test(lastLine)) {
    return null
  }
  return lastLineStart
}

export function segmentStreamingMarkdown(markdown: string): StreamingMarkdownSegments {
  const fenceOffset = getUnclosedFenceOffset(markdown)
  const structuralOffset = getIncompleteStructuralLineOffset(markdown)
  const cutOffset =
    fenceOffset == null
      ? structuralOffset
      : structuralOffset == null
        ? fenceOffset
        : Math.min(fenceOffset, structuralOffset)

  if (cutOffset == null || cutOffset <= 0 || cutOffset >= markdown.length) {
    return {
      stableMarkdown: markdown,
      streamTail: '',
      hasUnstableTail: false,
    }
  }

  return {
    stableMarkdown: markdown.slice(0, cutOffset),
    streamTail: markdown.slice(cutOffset),
    hasUnstableTail: true,
  }
}
