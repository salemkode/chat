/** Pure helpers shared by web and mobile `useSendMessage` implementations. */

import { extractErrorMessageFromUnknown } from './user-facing-errors'

export function getErrorMessageFromUnknown(error: unknown): string {
  return extractErrorMessageFromUnknown(error)
}

export function isExtraFieldValidationError(error: unknown, fieldName: string) {
  const message = getErrorMessageFromUnknown(error)
  return (
    message.includes('ArgumentValidationError') &&
    message.includes('extra field') &&
    message.includes(fieldName)
  )
}

export function buildAttachmentSummaryFromMimeTypes(
  attachments: ReadonlyArray<{ mimeType: string }>,
): { imageCount: number; fileCount: number; totalCount: number } | undefined {
  if (attachments.length === 0) {
    return undefined
  }
  let imageCount = 0
  let fileCount = 0
  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith('image/')) {
      imageCount += 1
    } else {
      fileCount += 1
    }
  }
  return {
    imageCount,
    fileCount,
    totalCount: imageCount + fileCount,
  }
}

/** Web passes `File` with `.type`; normalize to mime string. */
export function buildAttachmentSummaryFromFiles(
  attachments: ReadonlyArray<{ type: string }>,
): { imageCount: number; fileCount: number; totalCount: number } | undefined {
  if (attachments.length === 0) {
    return undefined
  }
  return buildAttachmentSummaryFromMimeTypes(
    attachments.map((file) => ({ mimeType: file.type || 'application/octet-stream' })),
  )
}

export function isSendPayloadVisuallyEmpty(prompt: string, attachmentCount: number) {
  return !prompt.trim() && attachmentCount === 0
}
