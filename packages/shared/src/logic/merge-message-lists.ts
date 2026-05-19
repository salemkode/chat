/**
 * Merge live Convex rows, offline snapshots, and in-flight send overlays without
 * empty-then-real flicker when live briefly returns [].
 */

import { hasLiveHandoffMatch } from './pending-send-core'
import { sortChatMessages } from './message-order'

export type MessageMergeRow = {
  id: string
  role: string
  text?: string
  parts?: unknown
  status?: string
  order?: number
  stepOrder?: number
  createdAt?: number
  localOnly?: boolean
  clientSendId?: string
}

export type InFlightSendForMerge = {
  clientSendId: string
  prompt: string
  attachments: ReadonlyArray<{ filename?: string; mediaType: string }>
  phase: 'uploading' | 'sending' | 'handoff' | 'failed' | 'settled'
  createdAt: number
  errorText?: string
  userMessage: MessageMergeRow
  failedAssistantMessage?: MessageMergeRow
}

function isOptimisticUserId(id: string) {
  return id.startsWith('optimistic-user-')
}

function messageKey(message: MessageMergeRow) {
  if (message.clientSendId) {
    return `send:${message.clientSendId}`
  }
  if (isOptimisticUserId(message.id)) {
    return `opt:${message.id}`
  }
  return `id:${message.id}`
}

function shouldIncludeInFlightSend(
  send: InFlightSendForMerge,
  liveMessages: readonly MessageMergeRow[],
) {
  if (send.phase === 'settled') {
    return false
  }
  if (send.phase === 'failed') {
    return true
  }
  if (send.phase === 'handoff' && hasLiveHandoffMatch(send.prompt, send.attachments, liveMessages)) {
    return false
  }
  if (
    (send.phase === 'sending' || send.phase === 'handoff' || send.phase === 'uploading') &&
    hasLiveHandoffMatch(send.prompt, send.attachments, liveMessages)
  ) {
    return false
  }
  return true
}

function inFlightToMessages(send: InFlightSendForMerge): MessageMergeRow[] {
  const rows: MessageMergeRow[] = [send.userMessage]
  if (send.phase === 'failed' && send.failedAssistantMessage) {
    rows.push(send.failedAssistantMessage)
  }
  return rows
}

/**
 * Overlay in-flight sends onto a base list, skipping rows superseded by live/optimistic data.
 */
export function overlayInFlightSends(
  base: readonly MessageMergeRow[],
  inFlightSends: readonly InFlightSendForMerge[],
): MessageMergeRow[] {
  const live = [...base]
  const keys = new Set(live.map(messageKey))
  const overlay: MessageMergeRow[] = []

  for (const send of inFlightSends) {
    if (!shouldIncludeInFlightSend(send, live)) {
      continue
    }
    for (const row of inFlightToMessages(send)) {
      const key = messageKey(row)
      if (keys.has(key)) {
        continue
      }
      keys.add(key)
      overlay.push(row)
    }
  }

  return sortChatMessages([...live, ...overlay])
}

export function mergeMessageLists(args: {
  live: readonly MessageMergeRow[] | undefined
  persisted: readonly MessageMergeRow[]
  inFlightSends?: readonly InFlightSendForMerge[]
}): MessageMergeRow[] {
  const persisted = [...args.persisted]
  const inFlightSends = args.inFlightSends ?? []
  const live = args.live

  if (live === undefined) {
    return overlayInFlightSends(persisted, inFlightSends)
  }

  if (live.length === 0 && (persisted.length > 0 || inFlightSends.length > 0)) {
    return overlayInFlightSends(persisted, inFlightSends)
  }

  return overlayInFlightSends(live, inFlightSends)
}
