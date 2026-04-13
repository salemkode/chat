const IMAGE_INPUT_CAPABILITIES = new Set([
  'vision',
  'image',
  'images',
  'image-input',
  'multimodal',
  'multi-modal',
])

const ATTACHMENT_INPUT_CAPABILITIES = new Set([
  ...IMAGE_INPUT_CAPABILITIES,
  'attachment',
  'attachments',
  'file',
  'files',
  'document',
  'documents',
  'pdf',
])

function normalizeCapability(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeModelCapabilities(capabilities?: string[] | null): string[] {
  if (!Array.isArray(capabilities)) {
    return []
  }

  const normalized = capabilities
    .map(normalizeCapability)
    .filter((capability) => capability.length > 0)

  return [...new Set(normalized)]
}

export function modelSupportsImageAttachments(capabilities?: string[] | null): boolean {
  const normalized = normalizeModelCapabilities(capabilities)
  return normalized.some((capability) => IMAGE_INPUT_CAPABILITIES.has(capability))
}

export function modelSupportsAnyAttachments(capabilities?: string[] | null): boolean {
  const normalized = normalizeModelCapabilities(capabilities)
  return normalized.some((capability) => ATTACHMENT_INPUT_CAPABILITIES.has(capability))
}
