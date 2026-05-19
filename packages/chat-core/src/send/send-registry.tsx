import { hasLiveHandoffMatch } from '@chat/shared/logic/pending-send-core'
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
import type { AttachmentAdapter } from '../adapters'
import type { ChatMessage } from '../types'
import {
  buildInFlightFailedAssistant,
  buildInFlightUserMessage,
  toInFlightSendForMerge,
  type CreateInFlightSendInput,
  type InFlightSendRecord,
  type PendingAttachmentPreview,
  type SendPhase,
} from './send-types'

export type SendRegistryContextValue = {
  createInFlightSend: (input: CreateInFlightSendInput) => InFlightSendRecord
  moveInFlightSendToThread: (clientSendId: string, threadId: string) => void
  setInFlightPhase: (clientSendId: string, phase: SendPhase, errorText?: string) => void
  clearInFlightSend: (clientSendId: string) => void
  clearFailedSendsForThread: (threadKey: string) => void
  selectInFlightMessages: (threadKey: string, liveMessages: ChatMessage[]) => ChatMessage[]
  selectInFlightSendsForMerge: (
    threadKey: string,
    liveMessages: ChatMessage[],
  ) => ReturnType<typeof toInFlightSendForMerge>[]
}

const SendRegistryContext = createContext<SendRegistryContextValue | null>(null)

function createClientSendId() {
  return `send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function SendRegistryProvider({
  attachmentAdapter,
  children,
}: {
  attachmentAdapter?: AttachmentAdapter<unknown>
  children: ReactNode
}) {
  const [inFlightSends, setInFlightSends] = useState<Record<string, InFlightSendRecord>>({})
  const inFlightRef = useRef(inFlightSends)

  useEffect(() => {
    inFlightRef.current = inFlightSends
  }, [inFlightSends])

  useEffect(() => {
    return () => {
      for (const record of Object.values(inFlightRef.current)) {
        attachmentAdapter?.revokePendingAttachments(record.attachments)
      }
    }
  }, [attachmentAdapter])

  const createInFlightSend = useCallback((input: CreateInFlightSendInput) => {
    const clientSendId = createClientSendId()
    const record: InFlightSendRecord = {
      clientSendId,
      threadKey: input.threadKey,
      prompt: input.prompt,
      attachments: input.attachments,
      phase: 'uploading',
      createdAt: Date.now(),
    }
    setInFlightSends((current) => ({
      ...current,
      [clientSendId]: record,
    }))
    return record
  }, [])

  const moveInFlightSendToThread = useCallback((clientSendId: string, threadId: string) => {
    setInFlightSends((current) => {
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
  }, [])

  const setInFlightPhase = useCallback(
    (clientSendId: string, phase: SendPhase, errorText?: string) => {
      setInFlightSends((current) => {
        const record = current[clientSendId]
        if (!record) {
          return current
        }
        return {
          ...current,
          [clientSendId]: {
            ...record,
            phase,
            errorText,
          },
        }
      })
    },
    [],
  )

  const clearInFlightSend = useCallback(
    (clientSendId: string) => {
      setInFlightSends((current) => {
        const record = current[clientSendId]
        if (!record) {
          return current
        }
        attachmentAdapter?.revokePendingAttachments(record.attachments)
        const { [clientSendId]: _removed, ...rest } = current
        return rest
      })
    },
    [attachmentAdapter],
  )

  const clearFailedSendsForThread = useCallback(
    (threadKey: string) => {
      setInFlightSends((current) => {
        let changed = false
        const nextEntries = Object.entries(current).filter(([, record]) => {
          const shouldRemove = record.threadKey === threadKey && record.phase === 'failed'
          if (shouldRemove) {
            changed = true
            attachmentAdapter?.revokePendingAttachments(record.attachments)
            return false
          }
          return true
        })
        if (!changed) {
          return current
        }
        return Object.fromEntries(nextEntries)
      })
    },
    [attachmentAdapter],
  )

  const recordsForThread = useCallback(
    (threadKey: string) =>
      Object.values(inFlightSends)
        .filter((record) => record.threadKey === threadKey)
        .sort((left, right) => left.createdAt - right.createdAt),
    [inFlightSends],
  )

  const selectInFlightMessages = useCallback(
    (threadKey: string, liveMessages: ChatMessage[]) => {
      const messages: ChatMessage[] = []
      for (const record of recordsForThread(threadKey)) {
        if (record.phase === 'settled') {
          continue
        }
        if (
          (record.phase === 'handoff' ||
            record.phase === 'sending' ||
            record.phase === 'uploading') &&
          hasLiveHandoffMatch(record.prompt, record.attachments, liveMessages)
        ) {
          continue
        }
        messages.push(buildInFlightUserMessage(record))
        if (record.phase === 'failed') {
          messages.push(buildInFlightFailedAssistant(record))
        }
      }
      return messages
    },
    [recordsForThread],
  )

  const selectInFlightSendsForMerge = useCallback(
    (threadKey: string, _liveMessages: ChatMessage[]) => {
      return recordsForThread(threadKey).map(toInFlightSendForMerge)
    },
    [recordsForThread],
  )

  const value = useMemo<SendRegistryContextValue>(
    () => ({
      createInFlightSend,
      moveInFlightSendToThread,
      setInFlightPhase,
      clearInFlightSend,
      clearFailedSendsForThread,
      selectInFlightMessages,
      selectInFlightSendsForMerge,
    }),
    [
      clearFailedSendsForThread,
      clearInFlightSend,
      createInFlightSend,
      moveInFlightSendToThread,
      selectInFlightMessages,
      selectInFlightSendsForMerge,
      setInFlightPhase,
    ],
  )

  return <SendRegistryContext value={value}>{children}</SendRegistryContext>
}

export function useSendRegistry() {
  const ctx = useContext(SendRegistryContext)
  if (!ctx) {
    throw new Error('useSendRegistry must be used within SendRegistryProvider')
  }
  return ctx
}

export function useSendRegistryOptional() {
  return useContext(SendRegistryContext)
}

/** Build pending attachment previews from platform files via adapter. */
export function createPendingPreviews<T>(
  files: T[],
  attachmentAdapter: AttachmentAdapter<T>,
): PendingAttachmentPreview[] {
  return attachmentAdapter.createPendingAttachments(files)
}
