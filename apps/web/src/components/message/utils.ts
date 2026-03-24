import type { FunctionReturnType } from 'convex/server'
import type { api } from '@convex/_generated/api'

export type MessageData = FunctionReturnType<
  typeof api.chat.listMessages
>['page'][number]

export type MessageFilePart = {
  url: string
  mediaType: string
  filename?: string
}

export function getMessageFileParts(
  parts: Array<Record<string, unknown>>,
): MessageFilePart[] {
  const files: MessageFilePart[] = []

  for (const part of parts) {
    if (part.type !== 'file' || typeof part.url !== 'string') {
      continue
    }

    files.push({
      url: part.url,
      mediaType:
        typeof part.mediaType === 'string'
          ? part.mediaType
          : 'application/octet-stream',
      filename: typeof part.filename === 'string' ? part.filename : undefined,
    })
  }

  return files
}

export function areMessagePropsEqual(
  prev: {
    threadId: string
    promptMessageId?: string
    isActiveGeneration?: boolean
    isStalled?: boolean
    message: MessageData
  },
  next: {
    threadId: string
    promptMessageId?: string
    isActiveGeneration?: boolean
    isStalled?: boolean
    message: MessageData
  },
): boolean {
  if (prev.threadId !== next.threadId) return false
  if (prev.promptMessageId !== next.promptMessageId) return false
  if (prev.isActiveGeneration !== next.isActiveGeneration) return false
  if (prev.isStalled !== next.isStalled) return false
  if (prev.message === next.message) return true

  const previousMessage = prev.message
  const nextMessage = next.message

  if (
    previousMessage.id !== nextMessage.id ||
    previousMessage.role !== nextMessage.role ||
    previousMessage.status !== nextMessage.status ||
    previousMessage.text !== nextMessage.text ||
    previousMessage.failureKind !== nextMessage.failureKind ||
    previousMessage.failureMode !== nextMessage.failureMode ||
    previousMessage.failureNote !== nextMessage.failureNote
  ) {
    return false
  }

  if (previousMessage.parts.length !== nextMessage.parts.length) {
    return false
  }

  if (previousMessage.parts === nextMessage.parts) {
    return true
  }

  for (let index = 0; index < previousMessage.parts.length; index += 1) {
    const prevPart = previousMessage.parts[index]
    const nextPart = nextMessage.parts[index]
    if (!prevPart || !nextPart || !areMessagePartObjectsEqual(prevPart, nextPart)) {
      return false
    }
  }

  return true
}

function areMessagePartObjectsEqual(
  previousPart: Record<string, unknown>,
  nextPart: Record<string, unknown>,
): boolean {
  if (previousPart === nextPart) {
    return true
  }

  const previousEntries = Object.entries(previousPart)
  if (previousEntries.length !== Object.keys(nextPart).length) {
    return false
  }

  for (const [key, previousValue] of previousEntries) {
    const nextValue = nextPart[key]
    if (previousValue === nextValue) {
      continue
    }

    return false
  }

  return true
}
