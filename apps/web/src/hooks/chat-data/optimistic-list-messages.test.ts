import type { OptimisticLocalStore } from 'convex/browser'
import { insertAtPosition } from 'convex/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyOptimisticGenerateMessage } from './optimistic-list-messages'

vi.mock('convex/react', () => ({
  insertAtPosition: vi.fn(),
}))

type QueryStub = {
  args: {
    threadId: string
    streamArgs?: unknown
  }
  value?: {
    page?: Array<{
      order: number
    }>
  }
}

function createLocalStore(queries: QueryStub[]): OptimisticLocalStore {
  return {
    getAllQueries: () => queries,
  } as unknown as OptimisticLocalStore
}

describe('applyOptimisticGenerateMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a user message and first response at the same order with client-first ids', () => {
    const localStore = createLocalStore([
      {
        args: { threadId: 'thread-1' },
        value: { page: [{ order: 3 }] },
      },
    ])

    applyOptimisticGenerateMessage(
      localStore,
      'thread-1',
      'Hello world',
      [{ filename: 'readme.txt', mediaType: 'text/plain' }],
      'client-req-123',
    )

    const calls = vi.mocked(insertAtPosition).mock.calls
    expect(calls).toHaveLength(2)

    const assistant = calls[0]?.[0]?.item as {
      id: string
      order: number
      stepOrder: number
      status: string
      key: string
    }
    const user = calls[1]?.[0]?.item as {
      id: string
      order: number
      stepOrder: number
      status: string
      key: string
    }

    expect(assistant.id).toBe('optimistic-assistant-client-req-123')
    expect(assistant.order).toBe(4)
    expect(assistant.stepOrder).toBe(1)
    expect(assistant.status).toBe('pending')
    expect(assistant.key).toBe('thread-1-4-1')

    expect(user.id).toBe('optimistic-user-client-req-123')
    expect(user.order).toBe(4)
    expect(user.stepOrder).toBe(0)
    expect(user.status).toBe('success')
    expect(user.key).toBe('thread-1-4-0')
  })

  it('starts from order 0 when no hydrated rows exist', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234)
    const localStore = createLocalStore([])

    applyOptimisticGenerateMessage(localStore, 'thread-1', 'Hi')

    const calls = vi.mocked(insertAtPosition).mock.calls
    expect(calls).toHaveLength(2)

    const assistant = calls[0]?.[0]?.item as { id: string; order: number }
    const user = calls[1]?.[0]?.item as { id: string; order: number }

    expect(assistant.id).toBe('optimistic-assistant-1234')
    expect(user.id).toBe('optimistic-user-1234')
    expect(assistant.order).toBe(0)
    expect(user.order).toBe(0)
  })
})
