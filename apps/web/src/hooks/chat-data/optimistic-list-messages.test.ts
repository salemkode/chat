import type { OptimisticLocalStore } from 'convex/browser'
import { insertAtPosition } from 'convex/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyOptimisticGenerateMessage,
  applyOptimisticRegenerateMessage,
} from './optimistic-list-messages'

vi.mock('convex/react', () => ({
  insertAtPosition: vi.fn(),
}))

type QueryStub = {
  args: {
    threadId: string
    streamArgs?: unknown
    paginationOpts?: {
      cursor: string | null
    }
  }
  value?: {
    page?: Array<{
      id: string
      order: number
      stepOrder?: number
    }>
  }
}

function createLocalStore(queries: QueryStub[]): OptimisticLocalStore {
  const queryValues = new Map(queries.map((query) => [JSON.stringify(query.args), query.value]))

  return {
    getAllQueries: () =>
      queries.map((query) => ({
        ...query,
        value: queryValues.get(JSON.stringify(query.args)),
      })),
    setQuery: (_query: unknown, args: QueryStub['args'], value: QueryStub['value']) => {
      queryValues.set(JSON.stringify(args), value)
    },
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
        value: { page: [{ id: 'm1', order: 3 }] },
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

describe('applyOptimisticRegenerateMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes downstream messages and inserts the pending assistant after the prompt', () => {
    vi.spyOn(Date, 'now').mockReturnValue(5000)
    const localStore = createLocalStore([
      {
        args: { threadId: 'thread-1', paginationOpts: { cursor: null } },
        value: {
          page: [
            { id: 'u3', order: 2, stepOrder: 0 },
            { id: 'a2', order: 1, stepOrder: 1 },
            { id: 'u2', order: 1, stepOrder: 0 },
            { id: 'a1', order: 0, stepOrder: 1 },
            { id: 'u1', order: 0, stepOrder: 0 },
          ],
        },
      },
    ])

    applyOptimisticRegenerateMessage(localStore, 'thread-1', 'u1')

    const queries = localStore.getAllQueries(null as never) as QueryStub[]
    expect(queries[0]?.value?.page?.map((message) => message.id)).toEqual(['u1'])

    const calls = vi.mocked(insertAtPosition).mock.calls
    expect(calls).toHaveLength(1)

    const assistant = calls[0]?.[0]?.item as {
      id: string
      order: number
      stepOrder: number
      status: string
      key: string
    }

    expect(assistant.id).toBe('optimistic-regenerate-5000')
    expect(assistant.order).toBe(0)
    expect(assistant.stepOrder).toBe(1)
    expect(assistant.status).toBe('streaming')
    expect(assistant.key).toBe('thread-1-0-1')
  })
})
