import { describe, expect, it } from 'vitest'
import {
  buildMentionProjectOptions,
  buildPendingProjectDraft,
} from './utils'

describe('buildMentionProjectOptions', () => {
  it('includes AI new-project option and prefers it for @new', () => {
    const result = buildMentionProjectOptions({
      mentionQuery: 'new',
      projects: [{ id: 'p1', name: 'Alpha', description: 'Project alpha' }],
      maxProjects: 1,
    })

    expect(result.preferNewOption).toBe(true)
    expect(result.options[0]?.kind).toBe('new-project-ai')
    expect(result.options[0]?.id).toBe('__new_project_ai__')
  })

  it('keeps matching existing projects alongside AI option', () => {
    const result = buildMentionProjectOptions({
      mentionQuery: 'alpha',
      projects: [
        { id: 'p1', name: 'Alpha', description: 'Main app' },
        { id: 'p2', name: 'Beta', description: 'Secondary' },
      ],
      maxProjects: 1,
    })

    expect(result.options).toHaveLength(2)
    expect(result.options[0]).toMatchObject({
      kind: 'project',
      id: 'p1',
      name: 'Alpha',
    })
    expect(result.options[1]).toMatchObject({
      kind: 'new-project-ai',
      id: '__new_project_ai__',
    })
  })
})

describe('buildPendingProjectDraft', () => {
  it('falls back to mention-derived name when AI suggestion is missing', () => {
    const draft = buildPendingProjectDraft({
      mentionQuery: 'new billing dashboard',
      suggestion: undefined,
      draftWithoutMention: 'help me build billing analytics',
      errorMessage: 'AI unavailable',
    })

    expect(draft.name).toBe('billing dashboard')
    expect(draft.source).toBe('fallback')
    expect(draft.error).toBe('AI unavailable')
  })

  it('uses AI values when available', () => {
    const draft = buildPendingProjectDraft({
      mentionQuery: 'new',
      suggestion: {
        name: 'Billing Assistant',
        description: 'Track invoices and subscriptions',
        source: 'ai',
      },
      draftWithoutMention: 'setup billing automations',
    })

    expect(draft.name).toBe('Billing Assistant')
    expect(draft.description).toBe('Track invoices and subscriptions')
    expect(draft.source).toBe('ai')
    expect(draft.error).toBeNull()
  })
})
