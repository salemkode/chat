import { describe, expect, it } from 'vitest'
import {
  buildAssistantPartsFromChunks,
  dedupePublicMessages,
  extractTextFromParts,
  type PublicChatMessage,
} from '../convex/lib/chatEngine'

function message(overrides: Partial<PublicChatMessage>): PublicChatMessage {
  return {
    id: overrides.id ?? 'm',
    _id: overrides._id ?? overrides.id ?? 'm',
    _creationTime: overrides._creationTime ?? 1,
    key: overrides.key ?? 'thread-0-0',
    role: overrides.role ?? 'assistant',
    text: overrides.text ?? '',
    parts: overrides.parts ?? [],
    status: overrides.status ?? 'success',
    order: overrides.order ?? 0,
    stepOrder: overrides.stepOrder ?? 0,
    agentName: overrides.agentName,
    userId: overrides.userId,
    failureKind: overrides.failureKind,
    failureMode: overrides.failureMode,
    failureNote: overrides.failureNote,
  }
}

describe('chat engine UI-message helpers', () => {
  it('merges streamed text chunks into a final assistant text part', () => {
    const parts = buildAssistantPartsFromChunks([
      { type: 'text-start', id: 'txt' },
      { type: 'text-delta', id: 'txt', delta: 'Hello' },
      { type: 'text-delta', id: 'txt', delta: ' world' },
      { type: 'text-end', id: 'txt' },
    ])

    expect(parts).toEqual([{ type: 'text', id: 'txt', text: 'Hello world', state: 'done' }])
    expect(extractTextFromParts(parts)).toBe('Hello world')
  })

  it('normalizes tool chunks to UI message tool parts', () => {
    const parts = buildAssistantPartsFromChunks([
      { type: 'tool-input-start', toolCallId: 'call_1', toolName: 'memory_search' },
      {
        type: 'tool-input-available',
        toolCallId: 'call_1',
        toolName: 'memory_search',
        input: { query: 'prefs' },
      },
      {
        type: 'tool-output-available',
        toolCallId: 'call_1',
        output: { ok: true },
      },
    ])

    expect(parts).toEqual([
      {
        type: 'tool-memory_search',
        toolName: 'memory_search',
        toolCallId: 'call_1',
        state: 'output-available',
        providerExecuted: undefined,
        title: undefined,
        input: { query: 'prefs' },
        args: { query: 'prefs' },
        output: { ok: true },
        result: { ok: true },
        errorText: undefined,
        preliminary: undefined,
      },
    ])
  })

  it('prefers finalized messages over pending or streaming duplicates', () => {
    const output = dedupePublicMessages([
      message({ id: 'pending', status: 'pending', order: 3, stepOrder: 1 }),
      message({ id: 'stream', status: 'streaming', text: 'partial', order: 3, stepOrder: 1 }),
      message({ id: 'final', status: 'success', text: 'done', order: 3, stepOrder: 1 }),
    ])

    expect(output).toHaveLength(1)
    expect(output[0]?.id).toBe('final')
    expect(output[0]?.text).toBe('done')
  })
})
