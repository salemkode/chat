export type ProjectMentionState = {
  start: number
  end: number
  query: string
}

export type ComposerReasoning = {
  enabled: boolean
  level?: 'low' | 'medium' | 'high'
}

export function formatAttachmentMeta(file: File) {
  return `${getAttachmentLabel(file.type)} • ${formatBytes(file.size)}`
}

function getAttachmentLabel(mediaType: string) {
  if (mediaType === 'application/pdf') {
    return 'PDF'
  }

  if (mediaType.startsWith('image/')) {
    return 'Image'
  }

  return 'File'
}

function formatBytes(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function getAttachmentFingerprint(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function isSupportedAttachment(file: File) {
  return file.type === 'application/pdf' || file.type.startsWith('image/')
}

export function getProjectMention(
  input: string,
  caretPosition: number,
): ProjectMentionState | null {
  const beforeCaret = input.slice(0, caretPosition)
  const match = /(^|\s)@([^\s@]*)$/.exec(beforeCaret)
  if (!match) {
    return null
  }

  const prefix = match[1] ?? ''

  return {
    start: beforeCaret.length - match[0].length + prefix.length,
    end: caretPosition,
    query: match[2] ?? '',
  }
}

export function getComposerErrorMessage(error: unknown): string {
  const fallback = 'Unable to send the message right now.'

  if (typeof error === 'string') {
    return sanitizeErrorMessage(error) || fallback
  }

  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message) || fallback
  }

  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown
      data?: unknown
    }

    if (typeof value.data === 'string') {
      return sanitizeErrorMessage(value.data) || fallback
    }

    if (
      value.data &&
      typeof value.data === 'object' &&
      'message' in value.data &&
      typeof value.data.message === 'string'
    ) {
      return sanitizeErrorMessage(value.data.message) || fallback
    }

    if (typeof value.message === 'string') {
      return sanitizeErrorMessage(value.message) || fallback
    }
  }

  return fallback
}

function sanitizeErrorMessage(message: string): string {
  const cleaned = message
    .replace(/\s*\[Request ID:[^\]]+\]\s*/g, ' ')
    .replace(/^Error:\s*/i, '')
    .trim()

  if (!cleaned || cleaned === 'Server Error') {
    return ''
  }

  if (cleaned === 'No model selected') {
    return 'Select a model before sending your message.'
  }

  return cleaned
}
