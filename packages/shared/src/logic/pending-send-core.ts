/**
 * Pure pending-send handoff rules shared by web and mobile.
 * Storage (Context vs Zustand) and attachment lifecycle stay in each app.
 */

export type PendingAttachmentFingerprintSource = {
  filename?: string
  mediaType?: string
}

export type LiveMessageForHandoff = {
  role: string
  text?: string
  status?: string
  parts?: unknown
}

function getSortedFingerprintsFromLiveParts(parts: unknown): string[] {
  if (!Array.isArray(parts)) {
    return []
  }

  const out: string[] = []
  for (const part of parts) {
    if (typeof part !== 'object' || part === null) {
      continue
    }
    const record = part as Record<string, unknown>
    if (record.type !== 'file') {
      continue
    }
    const filename = typeof record.filename === 'string' ? record.filename : ''
    const mediaType =
      typeof record.mediaType === 'string' ? record.mediaType : 'application/octet-stream'
    out.push(`${filename}:${mediaType}`)
  }
  return out.sort()
}

export function getSortedFingerprintsFromPendingAttachments(
  attachments: ReadonlyArray<PendingAttachmentFingerprintSource>,
): string[] {
  return attachments
    .map(
      (attachment) =>
        `${attachment.filename ?? ''}:${attachment.mediaType || 'application/octet-stream'}`,
    )
    .sort()
}

/**
 * Pending sends may include local files, but Convex optimistic user rows may omit file parts
 * until the mutation persists. Treat "live has no file parts yet" as compatible.
 */
export function attachmentsMatchForHandoff(
  pendingAttachments: ReadonlyArray<PendingAttachmentFingerprintSource>,
  liveParts: unknown,
): boolean {
  const pending = getSortedFingerprintsFromPendingAttachments(pendingAttachments)
  const live = getSortedFingerprintsFromLiveParts(liveParts)
  if (pending.length === 0) {
    return live.length === 0
  }
  if (live.length === 0) {
    return true
  }
  if (pending.length !== live.length) {
    return false
  }
  return pending.every((value, index) => value === live[index])
}

/**
 * Returns true when the **most recent user** row in `liveMessages` matches this send
 * (prompt + attachment fingerprint). Walking backward skips trailing assistant-only tails
 * until the latest user bubble, then compares only that row — not older history.
 *
 * This covers Convex optimistic user-only rows (no assistant yet) without requiring a
 * following assistant, which avoids double-rendering pending-send + optimistic user.
 */
export function hasLiveHandoffMatch(
  prompt: string,
  pendingAttachments: ReadonlyArray<PendingAttachmentFingerprintSource>,
  liveMessages: readonly LiveMessageForHandoff[],
): boolean {
  for (let index = liveMessages.length - 1; index >= 0; index -= 1) {
    const message = liveMessages[index]
    if (!message || message.role !== 'user') {
      continue
    }
    return (
      message.text === prompt &&
      attachmentsMatchForHandoff(pendingAttachments, message.parts)
    )
  }

  return false
}
