import { describe, expect, it } from 'vitest'
import { mergeMessageLists, overlayInFlightSends } from './merge-message-lists'

describe('mergeMessageLists', () => {
  it('uses persisted when live is undefined', () => {
    const result = mergeMessageLists({
      live: undefined,
      persisted: [{ id: 'a', role: 'user', text: 'hi' }],
    })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('keeps persisted when live is transiently empty', () => {
    const result = mergeMessageLists({
      live: [],
      persisted: [{ id: 'a', role: 'user', text: 'hi' }],
    })
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('prefers live when live has rows', () => {
    const result = mergeMessageLists({
      live: [{ id: 'b', role: 'user', text: 'live' }],
      persisted: [{ id: 'a', role: 'user', text: 'cached' }],
    })
    expect(result.map((m) => m.id)).toEqual(['b'])
  })
})

describe('overlayInFlightSends', () => {
  it('drops in-flight user row after handoff match', () => {
    const inFlight = [
      {
        clientSendId: 'send-1',
        prompt: 'hello',
        attachments: [],
        phase: 'handoff' as const,
        createdAt: 1,
        userMessage: {
          id: 'send-1-user',
          role: 'user',
          text: 'hello',
          localOnly: true,
          clientSendId: 'send-1',
        },
      },
    ]
    const live = [{ id: 'real', role: 'user', text: 'hello', parts: [] }]
    const result = overlayInFlightSends(live, inFlight)
    expect(result.map((m) => m.id)).toEqual(['real'])
  })
})
