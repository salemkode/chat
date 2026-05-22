import { describe, expect, it } from 'vitest'
import {
  modelSupportsAttachmentSummary,
  modelSupportsImageInput,
  resolveModelAttachmentMediaTypes,
} from './modelAttachmentPolicy'

describe('resolveModelAttachmentMediaTypes', () => {
  it('disables attachments for the native DeepSeek provider', () => {
    expect(
      resolveModelAttachmentMediaTypes({
        providerType: 'deepseek',
        capabilities: ['pdf', 'vision'],
        supportedAttachmentMediaTypes: ['application/pdf', 'image/*'],
      }),
    ).toEqual([])
  })

  it('treats an explicitly configured empty list as disabling attachments', () => {
    expect(
      resolveModelAttachmentMediaTypes({
        providerType: 'openai',
        capabilities: ['pdf', 'vision'],
        supportedAttachmentMediaTypes: [],
      }),
    ).toEqual([])
  })

  it('can skip the legacy default fallback for routing decisions', () => {
    expect(
      resolveModelAttachmentMediaTypes(
        {
          providerType: 'openai',
        },
        { fallbackWhenUnknown: false },
      ),
    ).toEqual([])
  })
})

describe('modelSupportsImageInput', () => {
  it('recognizes image support from explicit attachment media types', () => {
    expect(
      modelSupportsImageInput({
        providerType: 'openai',
        supportedAttachmentMediaTypes: ['image/*'],
      }),
    ).toBe(true)
  })
})

describe('modelSupportsAttachmentSummary', () => {
  it('accepts mixed image and file requests when both are supported', () => {
    expect(
      modelSupportsAttachmentSummary({
        providerType: 'openai',
        capabilities: ['vision', 'pdf'],
        attachmentSummary: {
          imageCount: 1,
          fileCount: 1,
          totalCount: 2,
        },
      }),
    ).toBe(true)
  })

  it('rejects non-image files when the model only supports images', () => {
    expect(
      modelSupportsAttachmentSummary({
        providerType: 'openai',
        capabilities: ['vision'],
        attachmentSummary: {
          imageCount: 0,
          fileCount: 1,
          totalCount: 1,
        },
      }),
    ).toBe(false)
  })

  it('rejects image requests when the model only supports documents', () => {
    expect(
      modelSupportsAttachmentSummary({
        providerType: 'openai',
        capabilities: ['pdf'],
        attachmentSummary: {
          imageCount: 1,
          fileCount: 0,
          totalCount: 1,
        },
      }),
    ).toBe(false)
  })
})
