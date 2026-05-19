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

  it('inserts only a user row with client-first id', () => {
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
    expect(calls).toHaveLength(1)

    const user = calls[0]?.[0]?.item as {
      id: string
      order: number
      stepOrder: number
      status: string
      key: string
    }

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
    expect(calls).toHaveLength(1)

    const user = calls[0]?.[0]?.item as { id: string; order: number }

    expect(user.id).toBe('optimistic-user-1234')
    expect(user.order).toBe(0)
  })
})
