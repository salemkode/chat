export type ProjectMentionState = {
  start: number
  end: number
  query: string
}

export type MentionProjectOption =
  | {
      kind: 'new-project-ai'
      id: typeof NEW_PROJECT_AI_OPTION_ID
      name: string
      description?: string
    }
  | {
      kind: 'project'
      id: string
      name: string
      description?: string
    }

export type PendingProjectDraft = {
  name: string
  description?: string
  loading: boolean
  error?: string | null
  source?: 'ai' | 'fallback'
  reason?: string
}

export const NEW_PROJECT_AI_OPTION_ID = '__new_project_ai__' as const

const NEW_PROJECT_MENTION_PREFIX = 'new'

export function getProjectMention(
  value: string,
  caretPosition: number,
): ProjectMentionState | null {
  const beforeCaret = value.slice(0, caretPosition)
  const match = /(^|\s)@([^\s@]*)$/.exec(beforeCaret)
  if (!match) {
    return null
  }

  const prefix = match[1] ?? ''

  return {
    start: beforeCaret.length - match[0].length + prefix.length,
    end: caretPosition,
    query: match[2] ?? '',
  }
}

export function removeMentionToken(value: string, mention: ProjectMentionState): string {
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
    .replace(/^new\s*[:-]?\s*/i, '')
    .trim()

  if (normalized.length > 0) {
    return normalized.slice(0, 60)
  }

  return 'New Project'
}

export function buildMentionProjectOptions(args: {
  mentionQuery: string
  projects: Array<{ id: string; name: string; description?: string }>
  maxProjects?: number
}) {
  const needle = args.mentionQuery.trim().toLowerCase()
  const maxProjects = args.maxProjects ?? 1
  const matchingProjects = args.projects
    .filter((project) => {
      if (!needle) {
        return true
      }
      return `${project.name}\n${project.description ?? ''}`.toLowerCase().includes(needle)
    })
    .slice(0, maxProjects)
    .map((project) => ({
      kind: 'project' as const,
      id: project.id,
      name: project.name,
      description: project.description,
    }))

  const newProjectOption: MentionProjectOption = {
    kind: 'new-project-ai',
    id: NEW_PROJECT_AI_OPTION_ID,
    name: 'New project with AI',
    description: 'Create and link a new project for this chat',
  }
  const preferNewOption = isNewProjectMentionQuery(args.mentionQuery)

  return {
    options: preferNewOption
      ? [newProjectOption, ...matchingProjects]
      : [...matchingProjects, newProjectOption],
    preferNewOption,
  }
}

export function buildPendingProjectDraft(args: {
  mentionQuery?: string
  suggestion?: {
    name?: string
    description?: string
    source?: 'ai' | 'fallback'
    reason?: string
  } | null
  draftWithoutMention: string
  errorMessage?: string
}): PendingProjectDraft {
  const suggestedName = args.suggestion?.name?.trim()
  const fallbackName = fallbackProjectNameFromMentionQuery(args.mentionQuery ?? '')
  const fallbackDescription = args.draftWithoutMention.replace(/\s+/g, ' ').trim().slice(0, 160)
  const normalizedDescription =
    args.suggestion?.description?.trim() || fallbackDescription || undefined

  return {
    name: (suggestedName || fallbackName).slice(0, 60),
    description: normalizedDescription,
    loading: false,
    error: args.errorMessage || null,
    source: args.suggestion?.source ?? 'fallback',
    reason: args.suggestion?.reason,
  }
}
