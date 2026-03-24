export type ProjectMentionState = {
  start: number
  end: number
  query: string
}

export function getProjectMention(
  value: string,
  caretPosition: number,
): ProjectMentionState | null {
  const beforeCaret = value.slice(0, caretPosition)
  const atIndex = beforeCaret.lastIndexOf('@')
  if (atIndex < 0) {
    return null
  }

  const segment = beforeCaret.slice(atIndex + 1)
  if (segment.includes(' ') || segment.includes('\n')) {
    return null
  }

  return {
    start: atIndex,
    end: caretPosition,
    query: segment,
  }
}

export function removeMentionToken(
  value: string,
  mention: ProjectMentionState,
): string {
  const before = value.slice(0, mention.start)
  const after = value.slice(mention.end)
  return `${before}${after}`
}
