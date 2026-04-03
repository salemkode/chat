'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ChatMessage } from '@/hooks/chat-data/shared'

export type PendingThreadKey = string
export type PendingSendPhase = 'pending' | 'handoff' | 'failed'

type PendingSendAttachment = {
  filename?: string
  mediaType: string
  url: string
}

type PendingSendRecord = {
  clientSendId: string
  threadKey: PendingThreadKey
  prompt: string
  attachments: PendingSendAttachment[]
  createdAt: number
  phase: PendingSendPhase
  errorText?: string
}

type PendingSendContextValue = {
  createPendingSend: (payload: {
    threadKey: PendingThreadKey
    prompt: string
    attachments: File[]
  }) => PendingSendRecord
  movePendingSendToThread: (clientSendId: string, threadId: string) => void
  markPendingHandoff: (clientSendId: string) => void
  markPendingFailed: (clientSendId: string, errorText: string) => void
  clearPendingSend: (clientSendId: string) => void
  clearFailedSendsForThread: (threadKey: PendingThreadKey) => void
  selectPendingMessages: (
    threadKey: PendingThreadKey,
    liveMessages: ChatMessage[],
  ) => ChatMessage[]
}

const PendingSendContext = createContext<PendingSendContextValue | null>(null)

function toPendingAttachments(files: File[]): PendingSendAttachment[] {
  return files.map((file) => ({
    filename: file.name,
    mediaType: file.type || 'application/octet-stream',
    url: URL.createObjectURL(file),
  }))
}

function revokeAttachments(attachments: PendingSendAttachment[]) {
  for (const attachment of attachments) {
    URL.revokeObjectURL(attachment.url)
  }
}

function toMessageParts(attachments: PendingSendAttachment[]) {
  return attachments.map((attachment) => ({
    type: 'file',
    url: attachment.url,
    mediaType: attachment.mediaType,
    filename: attachment.filename,
  }))
}

function getAttachmentFingerprints(parts: Array<Record<string, unknown>>) {
  return parts
    .filter((part) => part.type === 'file')
    .map((part) => {
      const filename =
        typeof part.filename === 'string' ? part.filename : undefined
      const mediaType =
        typeof part.mediaType === 'string'
          ? part.mediaType
          : 'application/octet-stream'
      return `${filename ?? ''}:${mediaType}`
    })
    .sort()
}

function hasLiveHandoffMatch(
  record: PendingSendRecord,
  liveMessages: ChatMessage[],
) {
  const pendingAttachments = record.attachments
    .map(
      (attachment) =>
        `${attachment.filename ?? ''}:${attachment.mediaType || 'application/octet-stream'}`,
    )
    .sort()

  for (let index = liveMessages.length - 1; index >= 0; index -= 1) {
    const message = liveMessages[index]
    if (!message || message.role !== 'user') {
      continue
    }
    if (message.text !== record.prompt) {
      continue
    }

    const liveAttachments = getAttachmentFingerprints(message.parts)
    if (pendingAttachments.length > 0) {
      if (liveAttachments.length !== pendingAttachments.length) {
        continue
      }
      if (
        liveAttachments.some(
          (fingerprint, attachmentIndex) =>
            fingerprint !== pendingAttachments[attachmentIndex],
        )
      ) {
        continue
      }
    }

    for (
      let assistantIndex = index + 1;
      assistantIndex < liveMessages.length;
      assistantIndex += 1
    ) {
      const assistant = liveMessages[assistantIndex]
      if (assistant?.role !== 'assistant') {
        continue
      }

      if (
        assistant.status === 'streaming' ||
        assistant.status === 'pending'
      ) {
        return true
      }
    }
  }

  return false
}

export function PendingSendsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [pendingSends, setPendingSends] = useState<
    Record<string, PendingSendRecord>
  >({})
  const pendingSendsRef = useRef(pendingSends)

  useEffect(() => {
    pendingSendsRef.current = pendingSends
  }, [pendingSends])

  useEffect(() => {
    return () => {
      for (const record of Object.values(pendingSendsRef.current)) {
        revokeAttachments(record.attachments)
      }
    }
  }, [])

  const createPendingSend = useCallback(
    (payload: {
      threadKey: PendingThreadKey
      prompt: string
      attachments: File[]
    }) => {
      const clientSendId = `pending-send-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
      const record: PendingSendRecord = {
        clientSendId,
        threadKey: payload.threadKey,
        prompt: payload.prompt,
        attachments: toPendingAttachments(payload.attachments),
        createdAt: Date.now(),
        phase: 'pending',
      }
      setPendingSends((current) => ({
        ...current,
        [clientSendId]: record,
      }))
      return record
    },
    [],
  )

  const movePendingSendToThread = useCallback(
    (clientSendId: string, threadId: string) => {
      setPendingSends((current) => {
        const record = current[clientSendId]
        if (!record) {
          return current
        }
        return {
          ...current,
          [clientSendId]: {
            ...record,
            threadKey: threadId,
          },
        }
      })
    },
    [],
  )

  const markPendingHandoff = useCallback((clientSendId: string) => {
    setPendingSends((current) => {
      const record = current[clientSendId]
      if (!record) {
        return current
      }
      return {
        ...current,
        [clientSendId]: {
          ...record,
          phase: 'handoff',
        },
      }
    })
  }, [])

  const markPendingFailed = useCallback(
    (clientSendId: string, errorText: string) => {
      setPendingSends((current) => {
        const record = current[clientSendId]
        if (!record) {
          return current
        }
        return {
          ...current,
          [clientSendId]: {
            ...record,
            phase: 'failed',
            errorText,
          },
        }
      })
    },
    [],
  )

  const clearPendingSend = useCallback((clientSendId: string) => {
    setPendingSends((current) => {
      const record = current[clientSendId]
      if (!record) {
        return current
      }
      revokeAttachments(record.attachments)
      const { [clientSendId]: _removed, ...rest } = current
      return rest
    })
  }, [])

  const clearFailedSendsForThread = useCallback((threadKey: PendingThreadKey) => {
    setPendingSends((current) => {
      let changed = false
      const nextEntries = Object.entries(current).filter(([, record]) => {
        const shouldRemove =
          record.threadKey === threadKey && record.phase === 'failed'
        if (shouldRemove) {
          changed = true
          revokeAttachments(record.attachments)
          return false
        }
        return true
      })

      if (!changed) {
        return current
      }

      return Object.fromEntries(nextEntries)
    })
  }, [])

  const selectPendingMessages = useCallback(
    (threadKey: PendingThreadKey, liveMessages: ChatMessage[]) => {
      const messages: ChatMessage[] = []
      const records = Object.values(pendingSends)
        .filter((record) => record.threadKey === threadKey)
        .sort((left, right) => left.createdAt - right.createdAt)

      for (const record of records) {
        if (
          record.phase === 'handoff' &&
          hasLiveHandoffMatch(record, liveMessages)
        ) {
          continue
        }

        const baseParts = toMessageParts(record.attachments)
        messages.push({
          id: `${record.clientSendId}-user`,
          role: 'user',
          text: record.prompt,
          parts: baseParts,
          status: 'success',
          order: record.createdAt,
          createdAt: record.createdAt,
          localOnly: true,
          clientSendId: record.clientSendId,
        })

        if (record.phase === 'failed') {
          messages.push({
            id: `${record.clientSendId}-assistant`,
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
          })
          continue
        }

        messages.push({
          id: `${record.clientSendId}-assistant`,
          role: 'assistant',
          text: '',
          parts: [],
          status: 'streaming',
          order: record.createdAt + 1,
          createdAt: record.createdAt + 1,
          localOnly: true,
          clientSendId: record.clientSendId,
        })
      }

      return messages
    },
    [pendingSends],
  )

  const value = useMemo<PendingSendContextValue>(
    () => ({
      createPendingSend,
      movePendingSendToThread,
      markPendingHandoff,
      markPendingFailed,
      clearPendingSend,
      clearFailedSendsForThread,
      selectPendingMessages,
    }),
    [
      clearFailedSendsForThread,
      clearPendingSend,
      createPendingSend,
      markPendingFailed,
      markPendingHandoff,
      movePendingSendToThread,
      selectPendingMessages,
    ],
  )

  return (
    <PendingSendContext.Provider value={value}>
      {children}
    </PendingSendContext.Provider>
  )
}

export function usePendingSends() {
  const value = useContext(PendingSendContext)
  if (!value) {
    throw new Error('usePendingSends must be used within a PendingSendsProvider')
  }
  return value
}
