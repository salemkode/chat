import { describe, expect, it } from 'vitest'
import { resolveModelAttachmentMediaTypes } from './model-capabilities'

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

  it('keeps inferred attachment support for other providers', () => {
    expect(
      resolveModelAttachmentMediaTypes({
        providerType: 'openai',
        capabilities: ['pdf'],
      }),
    ).toEqual(['application/pdf'])
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

  it('returns empty array by default when no capabilities or config are provided', () => {
    expect(resolveModelAttachmentMediaTypes({})).toEqual([])
  })

  it('returns empty array when capabilities have no attachment-related entries', () => {
    expect(
      resolveModelAttachmentMediaTypes({
        capabilities: ['text-generation'],
      }),
    ).toEqual([])
  })
})
