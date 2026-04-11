export type ProjectMentionState = {
  start: number
  end: number
  query: string
}

const NEW_PROJECT_MENTION_PREFIX = 'new'

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

export function isNewProjectMentionQuery(query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return normalized.startsWith(NEW_PROJECT_MENTION_PREFIX)
}

export function fallbackProjectNameFromMentionQuery(query: string): string {
  const normalized = query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^new\s*[:\-]?\s*/i, '')
    .trim()

  if (normalized.length > 0) {
    return normalized.slice(0, 60)
  }

  return 'New Project'
}
