import { describe, expect, it } from 'vitest'
import {
  inferMediaTypeFromName,
  normalizeAttachmentFilename,
  resolveAttachmentMediaType,
} from './attachment-metadata'

describe('normalizeAttachmentFilename', () => {
  it('strips directory segments and normalizes unicode', () => {
    expect(normalizeAttachmentFilename('/tmp/notes.pdf', 'attachment.pdf')).toBe('notes.pdf')
  })

  it('falls back when the name contains replacement characters', () => {
    expect(normalizeAttachmentFilename('\uFFFDbroken.pdf', 'attachment.pdf')).toBe('attachment.pdf')
  })
})

describe('inferMediaTypeFromName', () => {
  it('detects pdf before a numeric duplicate suffix', () => {
    expect(inferMediaTypeFromName('graduation pdf.1')).toBeUndefined()
    expect(inferMediaTypeFromName('graduation.pdf.1')).toBe('application/pdf')
    expect(inferMediaTypeFromName('تصور حفل تخرج.pdf')).toBe('application/pdf')
  })

  it('detects common image extensions', () => {
    expect(inferMediaTypeFromName('photo.JPG')).toBe('image/jpeg')
  })
})

describe('resolveAttachmentMediaType', () => {
  it('prefers a valid mime type from the picker', () => {
    expect(
      resolveAttachmentMediaType({
        filename: 'notes.pdf',
        mimeType: 'application/pdf',
        defaultMediaType: 'application/octet-stream',
      }),
    ).toBe('application/pdf')
  })

  it('infers from filename when mime type is missing', () => {
    expect(
      resolveAttachmentMediaType({
        filename: 'scan.png',
        mimeType: null,
        defaultMediaType: 'application/octet-stream',
      }),
    ).toBe('image/png')
  })
})
