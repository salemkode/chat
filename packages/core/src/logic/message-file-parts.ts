export type MessageFilePart = {
  url?: string
  mediaType: string
  filename?: string
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

/**
 * Normalizes Convex / AI SDK file UI parts for attachment rendering.
 * Does not require `url` so optimistic user rows (filename only) still display.
 */
export function getMessageFileParts(parts: Array<Record<string, unknown>>): MessageFilePart[] {
  const files: MessageFilePart[] = []

  for (const part of parts) {
    if (part.type !== 'file') {
      continue
    }

    const url = readOptionalString(part.url)
    const filename = readOptionalString(part.filename) ?? readOptionalString(part.name)
    const mediaType =
      readOptionalString(part.mediaType) ??
      readOptionalString(part.mimeType) ??
      'application/octet-stream'

    if (!url && !filename) {
      continue
    }

    files.push({
      url,
      mediaType,
      filename,
    })
  }

  return files
}
