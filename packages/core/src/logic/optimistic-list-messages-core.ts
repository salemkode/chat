/**
 * Pure shapes for Convex `listMessages` optimistic patches (user message on send only).
 * Assistant replies are not inserted optimistically; they arrive from the server/stream.
 */

export type OptimisticAttachmentRef = {
  filename?: string
  mediaType: string
}

export function maxOrderFromMessages(messages: Iterable<{ order: number }>): number {
  let maxOrder = -1
  for (const message of messages) {
    maxOrder = Math.max(maxOrder, message.order)
  }
  return maxOrder
}

export function nextOrderAfterMax(maxOrder: number): number {
  return maxOrder + 1
}

export function buildOptimisticUserRow(args: {
  threadId: string
  prompt: string
  order: number
  now: number
  clientRequestId?: string
  attachments?: OptimisticAttachmentRef[]
}) {
  const idSuffix = args.clientRequestId?.trim() || String(args.now)
  return {
    id: `optimistic-user-${idSuffix}`,
    role: 'user' as const,
    key: `${args.threadId}-${args.order}-0`,
    text: args.prompt,
    order: args.order,
    stepOrder: 0,
    status: 'success' as const,
    _creationTime: args.now,
    parts: [
      { type: 'text' as const, text: args.prompt, state: 'done' as const },
      ...(args.attachments ?? []).map((attachment) => ({
        type: 'file' as const,
        filename: attachment.filename,
        mediaType: attachment.mediaType,
      })),
    ],
  }
}
