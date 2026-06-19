import type { ChatMessage } from '../types'

export type SendPhase = 'uploading' | 'sending' | 'handoff' | 'failed' | 'settled'

export type PendingAttachmentPreview = {
  filename?: string
  mediaType: string
  url: string
}

export type InFlightSendRecord = {
  clientSendId: string
  threadKey: string
  prompt: string
  attachments: PendingAttachmentPreview[]
  phase: SendPhase
  createdAt: number
  errorText?: string
}

export type CreateInFlightSendInput = {
  threadKey: string
  prompt: string
  attachments: PendingAttachmentPreview[]
}

export function buildInFlightUserMessage(
  record: InFlightSendRecord,
): ChatMessage {
  return {
    id: `${record.clientSendId}-user`,
    role: 'user',
    text: record.prompt,
    parts: record.attachments.map((attachment) => ({
      type: 'file',
      url: attachment.url,
      mediaType: attachment.mediaType,
      filename: attachment.filename,
    })),
    status: 'success',
    order: record.createdAt,
    createdAt: record.createdAt,
    localOnly: true,
    clientSendId: record.clientSendId,
  }
}

export function buildInFlightFailedAssistant(record: InFlightSendRecord): ChatMessage {
  return {
    id: `${record.clientSendId}-assistant-failed`,
    role: 'assistant',
    text: '',
    parts: [],
    status: 'failed',
    order: record.createdAt + 1,
    createdAt: record.createdAt + 1,
    failureKind: 'error',
    failureMode: 'replace',
    failureNote: record.errorText || 'This message failed to generate.',
    localOnly: true,
    clientSendId: record.clientSendId,
  }
}

export function toInFlightSendForMerge(record: InFlightSendRecord) {
  return {
    clientSendId: record.clientSendId,
    prompt: record.prompt,
    attachments: record.attachments,
    phase: record.phase,
    createdAt: record.createdAt,
    errorText: record.errorText,
    userMessage: buildInFlightUserMessage(record),
    failedAssistantMessage:
      record.phase === 'failed' ? buildInFlightFailedAssistant(record) : undefined,
  }
}
