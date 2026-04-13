import { describe, expect, it } from 'vitest'
import {
  buildPromptMessageIdsByIndex,
  dequeueQueuedMessage,
  enqueueQueuedMessage,
  findPromptMessageId,
  getMessageFailurePresentation,
  isGenerationStalled,
  QUEUE_CAPACITY,
  type QueuedMessage,
} from './chat-generation'

function queuedMessage(text: string): QueuedMessage {
  return {
    text,
    searchEnabled: false,
    attachments: [],
  }
}

function failedAssistantMessage(args: {
  text?: string
  failureKind?: 'stopped' | 'error'
  failureMode?: 'replace' | 'clarify'
  failureNote?: string
}) {
  return {
    id: 'm1',
    role: 'assistant',
    status: 'failed',
    text: args.text ?? '',
    parts: [],
    failureKind: args.failureKind,
    failureMode: args.failureMode,
    failureNote: args.failureNote,
  }
}

describe('chat-generation failure presentation', () => {
  it('uses replace+stopped when provided', () => {
    const presentation = getMessageFailurePresentation(
      failedAssistantMessage({
        text: '',
        failureKind: 'stopped',
        failureMode: 'replace',
        failureNote: 'Generation stopped.',
      }),
    )

    expect(presentation).toEqual({
      kind: 'stopped',
      mode: 'replace',
      note: 'Generation stopped.',
    })
  })

  it('uses clarify+stopped when partial content exists', () => {
    const presentation = getMessageFailurePresentation(
      failedAssistantMessage({
        text: 'partial answer',
        failureKind: 'stopped',
        failureMode: 'clarify',
        failureNote: 'Generation stopped.',
      }),
    )

    expect(presentation).toEqual({
      kind: 'stopped',
      mode: 'clarify',
      note: 'Generation stopped.',
    })
  })

  it('uses replace+error when no content exists', () => {
    const presentation = getMessageFailurePresentation(
      failedAssistantMessage({
        text: '',
        failureKind: 'error',
        failureMode: 'replace',
        failureNote: 'Provider timeout.',
      }),
    )

    expect(presentation).toEqual({
      kind: 'error',
      mode: 'replace',
      note: 'Provider timeout.',
    })
  })

  it('uses clarify+error when partial content exists', () => {
    const presentation = getMessageFailurePresentation(
      failedAssistantMessage({
        text: 'partial answer',
        failureKind: 'error',
        failureMode: 'clarify',
        failureNote: 'Provider timeout.',
      }),
    )

    expect(presentation).toEqual({
      kind: 'error',
      mode: 'clarify',
      note: 'Provider timeout.',
    })
  })
})

describe('chat-generation queue behavior', () => {
  it('enqueues while there is capacity', () => {
    const first = enqueueQueuedMessage([], queuedMessage('one'))
    const second = enqueueQueuedMessage(first.queue, queuedMessage('two'))

    expect(first.overflow).toBe(false)
    expect(second.overflow).toBe(false)
    expect(second.queue.map((item) => item.text)).toEqual(['one', 'two'])
  })

  it('rejects overflow when queue is full', () => {
    const queue = Array.from({ length: QUEUE_CAPACITY }, (_, index) => queuedMessage(`q${index}`))

    const next = enqueueQueuedMessage(queue, queuedMessage('overflow'))

    expect(next.overflow).toBe(true)
    expect(next.queue).toHaveLength(QUEUE_CAPACITY)
    expect(next.queue.map((item) => item.text)).toEqual(['q0', 'q1', 'q2'])
  })

  it('dequeues FIFO', () => {
    const initial = [queuedMessage('one'), queuedMessage('two')]
    const first = dequeueQueuedMessage(initial)
    const second = dequeueQueuedMessage(first.queue)

    expect(first.item?.text).toBe('one')
    expect(second.item?.text).toBe('two')
    expect(second.queue).toHaveLength(0)
  })
})

describe('buildPromptMessageIdsByIndex', () => {
  it('matches findPromptMessageId for assistant rows', () => {
    const messages = [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
      { id: 'u2', role: 'user' },
      { id: 'a2', role: 'assistant' },
    ]

    const byIndex = buildPromptMessageIdsByIndex(messages)
    for (let i = 0; i < messages.length; i += 1) {
      expect(byIndex[i]).toBe(findPromptMessageId(messages, i))
    }
  })
})

describe('chat-generation stall detection', () => {
  it('becomes stalled at threshold', () => {
    expect(
      isGenerationStalled({
        lastProgressAt: 1_000,
        now: 21_000,
        thresholdMs: 20_000,
      }),
    ).toBe(true)
  })

  it('is not stalled before threshold', () => {
    expect(
      isGenerationStalled({
        lastProgressAt: 1_000,
        now: 20_999,
        thresholdMs: 20_000,
      }),
    ).toBe(false)
  })
})
