import type { FunctionReturnType } from 'convex/server'
import { api } from '@convex/_generated/api'

export const STALL_THRESHOLD_MS = 20_000
export const QUEUE_CAPACITY = 3

export type ChatMessage = FunctionReturnType<typeof api.chat.listMessages>['page'][number]

export type MessageFailureKind = 'stopped' | 'error'
export type MessageFailureMode = 'replace' | 'clarify'

export type QueuedMessage = {
  text: string
  modelDocId?: string
  projectId?: string
  searchEnabled: boolean
  searchMode?: 'auto' | 'required'
  reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
  attachments: File[]
}

export function findPromptMessageId(
  messages: ChatMessage[],
  assistantIndex: number,
): string | undefined {
  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'user') {
      return message.id
    }
  }

  return undefined
}

/** O(n) prompt ids: index i gets the latest user message id strictly before i. */
export function buildPromptMessageIdsByIndex(messages: ChatMessage[]): (string | undefined)[] {
  const result: (string | undefined)[] = new Array(messages.length)
  let lastUserId: string | undefined
  for (let i = 0; i < messages.length; i += 1) {
    result[i] = lastUserId
    const message = messages[i]
    if (message?.role === 'user') {
      lastUserId = message.id
    }
  }
  return result
}

export function getLatestActiveAssistant(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || message.role !== 'assistant') {
      continue
    }

    if (message.status === 'pending' || message.status === 'streaming') {
      return {
        index,
        message,
        promptMessageId: findPromptMessageId(messages, index),
      }
    }
  }

  return null
}

export function buildMessageProgressSignature(message: ChatMessage) {
  return `${message.text ?? ''}::${JSON.stringify(message.parts ?? [])}`
}

export function isGenerationStalled(args: {
  lastProgressAt: number
  now?: number
  thresholdMs?: number
}) {
  const now = args.now ?? Date.now()
  const thresholdMs = args.thresholdMs ?? STALL_THRESHOLD_MS
  return now - args.lastProgressAt >= thresholdMs
}

export function enqueueQueuedMessage(
  queue: QueuedMessage[],
  next: QueuedMessage,
  capacity = QUEUE_CAPACITY,
) {
  if (queue.length >= capacity) {
    return {
      queue,
      overflow: true,
    }
  }

  return {
    queue: [...queue, next],
    overflow: false,
  }
}

export function dequeueQueuedMessage(queue: QueuedMessage[]) {
  if (queue.length === 0) {
    return { item: null, queue }
  }

  const [item, ...rest] = queue
  return {
    item,
    queue: rest,
  }
}

export function getMessageFailurePresentation(message: ChatMessage): {
  kind: MessageFailureKind
  mode: MessageFailureMode
  note: string
} | null {
  if (message.status !== 'failed') {
    return null
  }

  const kind =
    message.failureKind === 'stopped' || message.failureKind === 'error'
      ? message.failureKind
      : 'error'
  const mode =
    message.failureMode === 'replace' || message.failureMode === 'clarify'
      ? message.failureMode
      : message.text?.trim()
        ? 'clarify'
        : 'replace'
  const note =
    typeof message.failureNote === 'string' && message.failureNote.trim()
      ? message.failureNote
      : kind === 'stopped'
        ? 'Generation stopped.'
        : 'This message failed to generate.'

  return { kind, mode, note }
}
