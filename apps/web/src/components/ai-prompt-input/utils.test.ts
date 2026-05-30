import { describe, expect, it } from 'vitest'
import {
  createPastedTextFile,
  extractClipboardImageFiles,
  isSupportedAttachment,
  shouldConvertToTextAttachment,
} from './utils'

function createTransfer(files: File[]) {
  const transfer = new DataTransfer()
  for (const file of files) {
    transfer.items.add(file)
  }
  return transfer
}

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

    const transfer = createTransfer([imageFile, pdfFile])

    const files = extractClipboardImageFiles({
      items: transfer.items,
      files: transfer.files,
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

    const transfer = createTransfer([imageFile, pdfFile])

    const files = extractClipboardImageFiles({
      items: new DataTransfer().items,
      files: transfer.files,
    })

    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe('clipboard-shot.webp')
    expect(files[0]?.type).toBe('image/webp')
  })
})

describe('text paste attachments', () => {
  it('marks long clipboard text for attachment conversion', () => {
    const longText = `${'A'.repeat(520)}\n`
    expect(shouldConvertToTextAttachment(longText)).toBe(true)
    expect(shouldConvertToTextAttachment('short')).toBe(false)
  })

  it('creates a real text file attachment for pasted text', () => {
    const file = createPastedTextFile('line one\nline two')
    expect(file.name.startsWith('pasted-text-')).toBe(true)
    expect(file.name.endsWith('.txt')).toBe(true)
    expect(file.type).toBe('text/plain')
    expect(file.size).toBeGreaterThan(0)
  })

  it('accepts plain text files as supported attachments', () => {
    const textFile = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    expect(isSupportedAttachment(textFile, ['text/plain'])).toBe(true)
  })
})
