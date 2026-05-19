import { isAttachmentMediaTypeAllowed } from '@chat/shared'

export {
  buildMentionProjectOptions,
  buildPendingProjectDraft,
  getProjectMention,
  type MentionProjectOption,
  type PendingProjectDraft,
  type ProjectMentionState,
} from '@chat/shared/logic/project-mention'

export type ComposerReasoning = {
  enabled: boolean
  level?: 'low' | 'medium' | 'high'
}

export type TextAttachment = {
  id: string
  text: string
  label: string
}

const TEXT_ATTACHMENT_CHAR_THRESHOLD = 500
const TEXT_ATTACHMENT_LINE_THRESHOLD = 10
const PASTED_TEXT_FILENAME_PREFIX = 'pasted-text'
const PASTED_TEXT_FILE_EXTENSION = '.txt'
const PASTED_TEXT_MEDIA_TYPE = 'text/plain'
const CLIPBOARD_IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
}

export function shouldConvertToTextAttachment(text: string): boolean {
  if (text.length >= TEXT_ATTACHMENT_CHAR_THRESHOLD) return true
  const lineCount = text.split('\n').length
  return lineCount >= TEXT_ATTACHMENT_LINE_THRESHOLD
}

export function createPastedTextFile(text: string): File {
  const date = new Date()
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join('')

  return new File([text], `${PASTED_TEXT_FILENAME_PREFIX}-${stamp}${PASTED_TEXT_FILE_EXTENSION}`, {
    type: PASTED_TEXT_MEDIA_TYPE,
    lastModified: Date.now(),
  })
}

let textAttachmentCounter = 0

function createTextAttachment(text: string): TextAttachment {
  textAttachmentCounter += 1
  const lineCount = text.split('\n').length
  const label =
    lineCount > 1
      ? `Pasted text (${lineCount} lines)`
      : `Pasted text (${formatBytes(new Blob([text]).size)})`
  return {
    id: `text-${Date.now()}-${textAttachmentCounter}`,
    text,
    label,
  }
}

export function getTextAttachmentPreview(text: string, maxLines = 3): string {
  const lines = text.split('\n')
  const preview = lines.slice(0, maxLines).join('\n')
  return lines.length > maxLines ? `${preview}…` : preview
}

export function combineTextAttachmentsWithPrompt(
  prompt: string,
  textAttachments: TextAttachment[],
): string {
  if (textAttachments.length === 0) return prompt
  const blocks = textAttachments.map((att) => att.text)
  const combined = blocks.join('\n\n')
  if (!prompt.trim()) return combined
  return `${combined}\n\n${prompt}`
}

export function formatAttachmentMeta(file: File) {
  return `${getAttachmentLabel(file.type)} • ${formatBytes(file.size)}`
}

function getAttachmentLabel(mediaType: string) {
  if (mediaType === 'application/pdf') {
    return 'PDF'
  }

  if (mediaType === PASTED_TEXT_MEDIA_TYPE) {
    return 'Text'
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

export function isSupportedAttachment(file: File, allowedMediaTypes: string[]) {
  return Boolean(file.type) && isAttachmentMediaTypeAllowed(file.type, allowedMediaTypes)
}

export function extractClipboardImageFiles(
  clipboardData: Pick<DataTransfer, 'files' | 'items'>,
): File[] {
  const filesFromItems = Array.from(clipboardData.items ?? []).flatMap((item, index) => {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      return []
    }

    const file = item.getAsFile()
    if (!file) {
      return []
    }

    return [normalizeClipboardImageFile(file, index)]
  })

  if (filesFromItems.length > 0) {
    return filesFromItems
  }

  return Array.from(clipboardData.files ?? [])
    .filter((file) => file.type.startsWith('image/'))
    .map((file, index) => normalizeClipboardImageFile(file, index))
}

function normalizeClipboardImageFile(file: File, index: number): File {
  if (file.name.trim()) {
    return file
  }

  const extension = CLIPBOARD_IMAGE_EXTENSION_BY_TYPE[file.type] ?? '.png'
  return new File([file], `pasted-image-${index + 1}${extension}`, {
    type: file.type || 'image/png',
    lastModified: file.lastModified || Date.now(),
  })
}

export { formatUserFacingError as getComposerErrorMessage } from '@chat/shared/logic/user-facing-errors'
