/** Pure generation / queue / stall helpers shared by web and mobile. */

export const STALL_THRESHOLD_MS = 20_000
export const QUEUE_CAPACITY = 3

export type QueuedMessageBase = {
  text: string
  modelDocId?: string
  projectId?: string
  searchEnabled: boolean
  searchMode?: 'auto' | 'required'
  reasoning?: { enabled: boolean; level?: 'low' | 'medium' | 'high' }
}

/** Platform passes concrete attachment item type (e.g. `File` or `LocalAttachment`). */
export type QueuedMessage<TItem = unknown> = QueuedMessageBase & {
  attachments: TItem[]
}

export type GenerationMessageLike = {
  id: string
  role: string
  text?: string
  status?: string
  parts?: unknown
}

export function findPromptMessageId(
  messages: readonly GenerationMessageLike[],
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

export function buildPromptMessageIdsByIndex(
  messages: readonly GenerationMessageLike[],
): (string | undefined)[] {
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

export function getLatestActiveAssistant(messages: readonly GenerationMessageLike[]) {
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

export function buildMessageProgressSignature(message: Pick<GenerationMessageLike, 'text' | 'parts'>) {
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

export function enqueueQueuedMessage<T>(
  queue: QueuedMessage<T>[],
  next: QueuedMessage<T>,
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

export function dequeueQueuedMessage<T>(queue: QueuedMessage<T>[]) {
  if (queue.length === 0) {
    return { item: null, queue } as const
  }
  const [item, ...rest] = queue
  return {
    item,
    queue: rest,
  }
}
