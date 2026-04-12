import { describe, expect, it } from 'vitest'
import {
  buildMentionProjectOptions,
  buildPendingProjectDraft,
  extractClipboardImageFiles,
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

describe('extractClipboardImageFiles', () => {
  it('prefers clipboard items and assigns a fallback name to unnamed pasted images', () => {
    const imageFile = new File(['image'], '', {
      type: 'image/png',
      lastModified: 123,
    })
    const pdfFile = new File(['pdf'], 'doc.pdf', {
      type: 'application/pdf',
      lastModified: 456,
    })

    const files = extractClipboardImageFiles({
      items: [
        {
          kind: 'file',
          type: 'image/png',
          getAsFile: () => imageFile,
        },
        {
          kind: 'file',
          type: 'application/pdf',
          getAsFile: () => pdfFile,
        },
      ] as unknown as DataTransferItemList,
      files: [pdfFile] as unknown as FileList,
    })

    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe('pasted-image-1.png')
    expect(files[0]?.type).toBe('image/png')
  })

  it('falls back to clipboard files when item metadata is unavailable', () => {
    const imageFile = new File(['image'], 'clipboard-shot.webp', {
      type: 'image/webp',
    })
    const pdfFile = new File(['pdf'], 'doc.pdf', {
      type: 'application/pdf',
    })

    const files = extractClipboardImageFiles({
      items: [] as unknown as DataTransferItemList,
      files: [imageFile, pdfFile] as unknown as FileList,
    })

    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe('clipboard-shot.webp')
    expect(files[0]?.type).toBe('image/webp')
  })
})
