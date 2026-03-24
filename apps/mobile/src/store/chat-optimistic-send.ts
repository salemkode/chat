import { create } from 'zustand'
import type { ChatRenderableAttachment, ChatRenderableMessage, LocalAttachment } from '../components/chat/types'

type PendingThreadKey = string
type PendingSendStatus = 'pending' | 'handoff' | 'failed'

export type PendingSendRecord = {
  clientSendId: string
  threadId: PendingThreadKey
  prompt: string
  attachments: LocalAttachment[]
  createdAt: number
  status: PendingSendStatus
  errorText?: string
  retryPayload: {
    prompt: string
    attachments: LocalAttachment[]
    modelDocId?: string
    projectId?: string
    searchEnabled: boolean
  }
}

type ChatOptimisticSendState = {
  pendingThreads: Record<PendingThreadKey, { resolvedThreadId?: string }>
  pendingSends: Record<string, PendingSendRecord>
  createPendingSend: (payload: {
    threadId: string
    prompt: string
    attachments: LocalAttachment[]
    modelDocId?: string
    projectId?: string
    searchEnabled: boolean
  }) => PendingSendRecord
  moveThreadKey: (fromThreadId: string, toThreadId: string) => void
  markHandoff: (clientSendId: string) => void
  markFailed: (clientSendId: string, errorText: string) => void
  clearRequest: (clientSendId: string) => void
  clearFailedForThread: (threadId: string) => void
  getPendingSendByMessageId: (messageId: string) => PendingSendRecord | null
}

function toOptimisticAttachments(attachments: LocalAttachment[]): ChatRenderableAttachment[] {
  return attachments.map((item) => ({
    kind: item.mimeType.startsWith('image/') ? 'image' : 'file',
    url: item.uri,
    mediaType: item.mimeType,
    filename: item.name,
  }))
}

export function selectRenderableForThread(
  state: ChatOptimisticSendState,
  threadId?: string,
): ChatRenderableMessage[] {
  if (!threadId) return []

  const rows: ChatRenderableMessage[] = []
  for (const record of Object.values(state.pendingSends)) {
    if (record.threadId !== threadId) continue
    const attachments = toOptimisticAttachments(record.attachments)

    if (record.status === 'failed') {
      rows.push({
        id: `${record.clientSendId}-user`,
        role: 'user',
        text: record.prompt,
        attachments,
        status: 'success',
        createdAt: record.createdAt,
        local: true,
        requestId: record.clientSendId,
      })
      rows.push({
        id: `${record.clientSendId}-assistant`,
        role: 'assistant',
        text: '',
        status: 'failed',
        errorText: record.errorText || 'Failed to send message.',
        createdAt: record.createdAt + 1,
        local: true,
        requestId: record.clientSendId,
        retryable: true,
      })
      continue
    }

    if (record.status === 'pending') {
      rows.push({
        id: `${record.clientSendId}-user`,
        role: 'user',
        text: record.prompt,
        attachments,
        status: 'success',
        createdAt: record.createdAt,
        local: true,
        requestId: record.clientSendId,
      })
      rows.push({
        id: `${record.clientSendId}-assistant`,
        role: 'assistant',
        text: '',
        status: 'streaming',
        createdAt: record.createdAt + 1,
        local: true,
        requestId: record.clientSendId,
      })
    }
  }

  return rows.sort((left, right) => (right.createdAt ?? 0) - (left.createdAt ?? 0))
}

export const useChatOptimisticSendStore = create<ChatOptimisticSendState>((set, get) => ({
  pendingThreads: {},
  pendingSends: {},
  createPendingSend: ({
    threadId,
    prompt,
    attachments,
    modelDocId,
    projectId,
    searchEnabled,
  }) => {
    const clientSendId = `send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const record: PendingSendRecord = {
      clientSendId,
      threadId,
      prompt,
      attachments,
      createdAt: Date.now(),
      status: 'pending',
      retryPayload: {
        prompt,
        attachments,
        modelDocId,
        projectId,
        searchEnabled,
      },
    }
    set((state) => ({
      pendingSends: {
        ...state.pendingSends,
        [clientSendId]: record,
      },
    }))
    return record
  },
  moveThreadKey: (fromThreadId, toThreadId) => {
    set((state) => {
      const nextSends = Object.fromEntries(
        Object.entries(state.pendingSends).map(([key, record]) => [
          key,
          record.threadId === fromThreadId ? { ...record, threadId: toThreadId } : record,
        ]),
      )
      return {
        pendingThreads: {
          ...state.pendingThreads,
          [fromThreadId]: { resolvedThreadId: toThreadId },
        },
        pendingSends: nextSends,
      }
    })
  },
  markHandoff: (clientSendId) => {
    set((state) => {
      const record = state.pendingSends[clientSendId]
      if (!record) return state
      return {
        pendingSends: {
          ...state.pendingSends,
          [clientSendId]: {
            ...record,
            status: 'handoff',
          },
        },
      }
    })
  },
  markFailed: (clientSendId, errorText) => {
    set((state) => {
      const record = state.pendingSends[clientSendId]
      if (!record) return state
      return {
        pendingSends: {
          ...state.pendingSends,
          [clientSendId]: {
            ...record,
            status: 'failed',
            errorText,
          },
        },
      }
    })
  },
  clearRequest: (clientSendId) => {
    set((state) => {
      if (!state.pendingSends[clientSendId]) return state
      const { [clientSendId]: _, ...rest } = state.pendingSends
      return { pendingSends: rest }
    })
  },
  clearFailedForThread: (threadId) => {
    set((state) => ({
      pendingSends: Object.fromEntries(
        Object.entries(state.pendingSends).filter(
          ([, record]) => !(record.threadId === threadId && record.status === 'failed'),
        ),
      ),
    }))
  },
  getPendingSendByMessageId: (messageId) => {
    const state = get()
    return (
      Object.values(state.pendingSends).find(
        (record) =>
          messageId === `${record.clientSendId}-assistant` || messageId === `${record.clientSendId}-user`,
      ) ?? null
    )
  },
}))
