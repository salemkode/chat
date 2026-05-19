import {
  buildMessageProgressSignature,
  canStopActiveGeneration,
  getLatestActiveAssistant,
  isGenerationStalled,
  type GenerationMessageLike,
} from '@chat/shared/logic/chat-generation-core'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '../types'

export type ActiveGenerationState = {
  index: number
  message: GenerationMessageLike
  promptMessageId: string | undefined
}

export type UseGenerationStateResult = {
  activeGeneration: ActiveGenerationState | null
  /** No tokens/activity progress for {@link STALL_THRESHOLD_MS}. */
  isStalled: boolean
  /** User may stop while content streams, or force-stop after a stall. */
  canStop: boolean
  /** Same as stalled: loading with no observable response. */
  canForceStop: boolean
}

export function useGenerationState(
  messages: readonly ChatMessage[],
): UseGenerationStateResult {
  const activeGeneration = useMemo(
    () => getLatestActiveAssistant(messages),
    [messages],
  )
  const activeMessage = activeGeneration?.message
  const activeSignature = useMemo(
    () => (activeMessage ? buildMessageProgressSignature(activeMessage) : null),
    [activeMessage],
  )
  const [lastProgressAt, setLastProgressAt] = useState(() => Date.now())
  const [tick, setTick] = useState(() => Date.now())
  const activeMessageIdRef = useRef<string | null>(null)
  const activeSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeMessage || !activeSignature) {
      activeMessageIdRef.current = null
      activeSignatureRef.current = null
      return
    }

    if (activeMessageIdRef.current !== activeMessage.id) {
      activeMessageIdRef.current = activeMessage.id
      activeSignatureRef.current = activeSignature
      setLastProgressAt(Date.now())
      return
    }

    if (activeSignatureRef.current !== activeSignature) {
      activeSignatureRef.current = activeSignature
      setLastProgressAt(Date.now())
    }
  }, [activeMessage, activeSignature])

  useEffect(() => {
    if (!activeMessage) {
      return
    }

    const intervalId = setInterval(() => {
      setTick(Date.now())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [activeMessage])

  const isStalled = Boolean(
    activeMessage &&
      isGenerationStalled({
        lastProgressAt,
        now: tick,
      }),
  )

  const canStop = canStopActiveGeneration({
    message: activeMessage,
    isStalled,
  })

  return {
    activeGeneration,
    isStalled,
    canStop,
    canForceStop: isStalled,
  }
}
