const MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  gif: 'image/gif',
  heic: 'image/heic',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  md: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  webp: 'image/webp',
}

const KNOWN_EXTENSIONS = Object.keys(MIME_BY_EXTENSION)

function basenameFromPath(name: string): string {
  const normalized = name.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
}

/**
 * Normalizes a picked filename for upload metadata (NFC, no path segments).
 * Falls back when the name is empty or contains replacement characters (mojibake).
 */
export function normalizeAttachmentFilename(
  name: string | null | undefined,
  fallback: string,
): string {
  const trimmed = (name ?? '').trim().normalize('NFC')
  const base = basenameFromPath(trimmed)
  if (!base || base.includes('\uFFFD')) {
    return fallback
  }
  return base
}

function extensionFromName(name: string): string | undefined {
  const lower = name.toLowerCase()
  const segments = lower.split('.')
  const last = segments[segments.length - 1]
  if (last && last !== lower && MIME_BY_EXTENSION[last]) {
    return last
  }

  for (const ext of KNOWN_EXTENSIONS) {
    const suffix = `.${ext}`
    const index = lower.lastIndexOf(suffix)
    if (index === -1) {
      continue
    }
    const trailing = lower.slice(index + suffix.length)
    if (trailing === '' || /^\.[0-9]+$/.test(trailing)) {
      return ext
    }
  }

  return undefined
}

export function inferMediaTypeFromName(name?: string | null): string | undefined {
  if (!name) {
    return undefined
  }

  const extension = extensionFromName(name.trim())
  if (!extension) {
    return undefined
  }

  return MIME_BY_EXTENSION[extension]
}

export function resolveAttachmentMediaType(args: {
  filename: string
  mimeType?: string | null
  defaultMediaType: string
}): string {
  const trimmedMime = args.mimeType?.trim()
  if (trimmedMime && trimmedMime.includes('/')) {
    return trimmedMime
  }

  return inferMediaTypeFromName(args.filename) ?? args.defaultMediaType
}
