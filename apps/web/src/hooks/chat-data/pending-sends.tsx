'use client'

/**
 * Web compatibility layer over chat-core SendRegistry.
 * Blob previews stay local until upload/handoff; list merging is in useThreadMessages.
 */

import type { ReactNode } from 'react'
import {
  SendRegistryProvider,
  useSendRegistry,
  createPendingPreviews,
} from '@chat/chat-core'
import { createWebAttachmentAdapter } from '@/lib/chat-core-adapters'
import type { ChatMessage } from '@/hooks/chat-data/shared'

const webAttachmentAdapter = createWebAttachmentAdapter()

export function PendingSendsProvider({ children }: { children: ReactNode }) {
  return (
    <SendRegistryProvider attachmentAdapter={webAttachmentAdapter}>
      {children}
    </SendRegistryProvider>
  )
}

export function usePendingSends() {
  const registry = useSendRegistry()

  return {
    createPendingSend: (payload: {
      threadKey: string
      prompt: string
      attachments: File[]
    }) => {
      const previews = createPendingPreviews(payload.attachments, webAttachmentAdapter)
      return registry.createInFlightSend({
        threadKey: payload.threadKey,
        prompt: payload.prompt,
        attachments: previews,
      })
    },
    movePendingSendToThread: registry.moveInFlightSendToThread,
    markPendingHandoff: (clientSendId: string) => {
      registry.setInFlightPhase(clientSendId, 'handoff')
    },
    markPendingFailed: (clientSendId: string, errorText: string) => {
      registry.setInFlightPhase(clientSendId, 'failed', errorText)
    },
    clearPendingSend: (clientSendId: string) => {
      registry.setInFlightPhase(clientSendId, 'settled')
      registry.clearInFlightSend(clientSendId)
    },
    clearFailedSendsForThread: registry.clearFailedSendsForThread,
    selectPendingMessages: (threadKey: string, liveMessages: ChatMessage[]) =>
      registry.selectInFlightMessages(threadKey, liveMessages),
  }
}
