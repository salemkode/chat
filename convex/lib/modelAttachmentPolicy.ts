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

const GENERIC_FILE_INPUT_CAPABILITIES = new Set(['attachment', 'attachments', 'file', 'files'])
const DOCUMENT_INPUT_CAPABILITIES = new Set(['document', 'documents', 'pdf'])
const DEFAULT_ATTACHMENT_MEDIA_TYPES = ['image/*', 'application/pdf'] as const

export type ModelAttachmentValidationStatus = 'pending' | 'valid' | 'invalid'

function normalizeCapability(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeMediaTypePattern(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidAttachmentMediaTypePattern(value: string): boolean {
  const normalized = normalizeMediaTypePattern(value)
  return /^[a-z0-9!#$&^_.+-]+\/(\*|[a-z0-9!#$&^_.+-]+)$/.test(normalized)
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

export function normalizeAttachmentMediaTypes(mediaTypes?: string[] | null): string[] {
  if (!Array.isArray(mediaTypes)) {
    return []
  }

  const normalized = mediaTypes
    .map(normalizeMediaTypePattern)
    .filter((value) => value.length > 0)
    .filter((value) => isValidAttachmentMediaTypePattern(value))

  return [...new Set(normalized)]
}

export function inferAttachmentMediaTypesFromCapabilities(
  capabilities?: string[] | null,
): string[] | undefined {
  const normalizedCapabilities = normalizeModelCapabilities(capabilities)
  if (normalizedCapabilities.length === 0) {
    return undefined
  }

  const capabilitySet = new Set(normalizedCapabilities)
  const supportsAny = normalizedCapabilities.some((capability) =>
    ATTACHMENT_INPUT_CAPABILITIES.has(capability),
  )
  if (!supportsAny) {
    return []
  }

  const supportsImages = normalizedCapabilities.some((capability) => IMAGE_INPUT_CAPABILITIES.has(capability))
  const supportsDocuments = normalizedCapabilities.some(
    (capability) =>
      GENERIC_FILE_INPUT_CAPABILITIES.has(capability) || DOCUMENT_INPUT_CAPABILITIES.has(capability),
  )

  const inferred: string[] = []
  if (supportsImages) {
    inferred.push('image/*')
  }
  if (supportsDocuments || capabilitySet.has('pdf')) {
    inferred.push('application/pdf')
  }
  if (inferred.length > 0) {
    return inferred
  }

  return [...DEFAULT_ATTACHMENT_MEDIA_TYPES]
}

export function resolveModelAttachmentMediaTypes(args: {
  capabilities?: string[] | null
  supportedAttachmentMediaTypes?: string[] | null
  attachmentValidationStatus?: ModelAttachmentValidationStatus | null
}): string[] {
  const customMediaTypes = normalizeAttachmentMediaTypes(args.supportedAttachmentMediaTypes)
  if (customMediaTypes.length > 0) {
    return customMediaTypes
  }

  if (args.attachmentValidationStatus === 'invalid') {
    return []
  }

  const inferred = inferAttachmentMediaTypesFromCapabilities(args.capabilities)
  if (Array.isArray(inferred)) {
    return inferred
  }

  return [...DEFAULT_ATTACHMENT_MEDIA_TYPES]
}

export function mediaTypeMatchesPattern(mediaType: string, pattern: string): boolean {
  const normalizedMediaType = normalizeMediaTypePattern(mediaType)
  const normalizedPattern = normalizeMediaTypePattern(pattern)
  if (!normalizedMediaType || !isValidAttachmentMediaTypePattern(normalizedPattern)) {
    return false
  }

  const [mediaTypeGroup, mediaSubtype] = normalizedMediaType.split('/')
  const [patternGroup, patternSubtype] = normalizedPattern.split('/')
  if (!mediaTypeGroup || !mediaSubtype || !patternGroup || !patternSubtype) {
    return false
  }

  return patternGroup === mediaTypeGroup && (patternSubtype === '*' || patternSubtype === mediaSubtype)
}

export function isMediaTypeAllowed(mediaType: string, allowedMediaTypes: string[]): boolean {
  return allowedMediaTypes.some((pattern) => mediaTypeMatchesPattern(mediaType, pattern))
}

