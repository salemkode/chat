import { describe, expect, it } from 'vitest'
import type { OptimisticLocalStore } from 'convex/browser'
import {
  applyOptimisticCreateThread,
  filterPersistableThreads,
  isOptimisticThreadId,
} from './optimistic-threads'

type ThreadsWithMetadata = Parameters<typeof filterPersistableThreads>[0]

function createMockLocalStore(args?: {
  threads?: ThreadsWithMetadata
  projects?: Array<{ id: string; name: string }>
}) {
  let threads = args?.threads
  const projects = args?.projects
  let setCalled = false
  let getQueryCalls = 0

  const localStore = {
    getQuery(_query: unknown) {
      getQueryCalls += 1
      if (getQueryCalls === 1) {
        return threads
      }
      if (getQueryCalls === 2) {
        return projects
      }
      return undefined
    },
    setQuery(_query: unknown, _queryArgs: unknown, value: unknown) {
      if (!Array.isArray(value)) {
        threads = undefined
        return
      }
      threads = value as ThreadsWithMetadata
      setCalled = true
    },
  } as unknown as OptimisticLocalStore

  return {
    localStore,
    getThreads: () => threads,
    wasSetCalled: () => setCalled,
  }
}

describe('optimistic thread helpers', () => {
  it('adds an optimistic row when threads query is hydrated', () => {
    const now = Date.now()
    const seedThreads = [
      {
        _id: 'thread-1',
        _creationTime: now - 1000,
        lastMessageAt: now - 1000,
        title: 'Existing',
        metadata: null,
        project: null,
      },
    ]
    const store = createMockLocalStore({ threads: seedThreads })

    applyOptimisticCreateThread(store.localStore, {
      title: 'New local first thread',
      clientThreadKey: 'client-thread-123',
    })

    const next = store.getThreads()
    expect(Array.isArray(next)).toBe(true)
    expect(next?.[0]?._id).toBe('optimistic-thread-client-thread-123')
    expect(next?.[0]?.title).toBe('New local first thread')
    expect(next?.[1]?._id).toBe('thread-1')
  })

  it('resolves project name from projects query', () => {
    const store = createMockLocalStore({
      threads: [],
      projects: [{ id: 'project-1', name: 'Roadmap' }],
    })

    applyOptimisticCreateThread(store.localStore, {
      title: 'Project chat',
      projectId: 'project-1',
      clientThreadKey: 'client-thread-456',
    })

    const next = store.getThreads()
    expect(next?.[0]?.project).toEqual({
      id: 'project-1',
      name: 'Roadmap',
    })
  })

  it('no-ops when thread list query is not hydrated', () => {
    const store = createMockLocalStore({ threads: undefined })
    applyOptimisticCreateThread(store.localStore, {
      title: 'No hydration yet',
      clientThreadKey: 'client-thread-789',
    })
    expect(store.wasSetCalled()).toBe(false)
  })

  it('detects optimistic ids and filters them from cache snapshots', () => {
    expect(isOptimisticThreadId('optimistic-thread-a')).toBe(true)
    expect(isOptimisticThreadId('thread-a')).toBe(false)

    const snapshot: ThreadsWithMetadata = [
      {
        _id: 'optimistic-thread-a',
        _creationTime: 1,
        lastMessageAt: 1,
        title: 'Temp',
        metadata: null,
        project: null,
      },
      {
        _id: 'thread-b',
        _creationTime: 2,
        lastMessageAt: 2,
        title: 'Real',
        metadata: null,
        project: null,
      },
    ]
    const filtered = filterPersistableThreads(snapshot)

    expect(filtered.map((thread) => thread._id)).toEqual(['thread-b'])
    expect(filterPersistableThreads([])).toEqual([])
  })
})
