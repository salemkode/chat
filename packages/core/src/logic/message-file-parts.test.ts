import { describe, expect, it } from 'vitest'
import { getMessageFileParts } from './message-file-parts'

describe('getMessageFileParts', () => {
  it('includes optimistic file parts without url when filename is present', () => {
    expect(
      getMessageFileParts([
        {
          type: 'file',
          filename: 'notes.pdf',
          mediaType: 'application/pdf',
        },
      ]),
    ).toEqual([
      {
        url: undefined,
        filename: 'notes.pdf',
        mediaType: 'application/pdf',
      },
    ])
  })

  it('reads legacy mimeType and name fields', () => {
    expect(
      getMessageFileParts([
        {
          type: 'file',
          name: 'scan.png',
          mimeType: 'image/png',
          url: 'https://example.com/scan.png',
        },
      ]),
    ).toEqual([
      {
        url: 'https://example.com/scan.png',
        filename: 'scan.png',
        mediaType: 'image/png',
      },
    ])
  })
})
