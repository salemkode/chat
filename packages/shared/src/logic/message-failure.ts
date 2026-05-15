export type MessageFailureKind = 'stopped' | 'error'
export type MessageFailureMode = 'replace' | 'clarify'

/** Shared failure UI mapping (web + mobile). */
export function getMessageFailurePresentation(message: {
  status?: string
  failureKind?: string
  failureMode?: string
  failureNote?: string
  text?: string
}): {
  kind: MessageFailureKind
  mode: MessageFailureMode
  note: string
} | null {
  if (message.status !== 'failed') {
    return null
  }

  const kind: MessageFailureKind =
    message.failureKind === 'stopped' || message.failureKind === 'error'
      ? message.failureKind
      : 'error'
  const mode: MessageFailureMode =
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
