import { describe, expect, it } from 'vitest'
import { buildRagSearchFiltersForScope, memoryRagEntryMatchesScope } from './memoryShared'

describe('buildRagSearchFiltersForScope', () => {
  it('uses namespace for user isolation and only filters by the requested scope target', () => {
    expect(buildRagSearchFiltersForScope({ scope: 'all' })).toEqual([])
    expect(buildRagSearchFiltersForScope({ scope: 'user' })).toEqual([])
    expect(buildRagSearchFiltersForScope({ scope: 'thread', threadId: 'thread-1' })).toEqual([
      { name: 'threadId', value: 'thread-1' },
    ])
  })
})

describe('memoryRagEntryMatchesScope', () => {
  it('keeps entries only when their metadata scope matches the requested scope', () => {
    const userEntry = { metadata: { scope: 'user', memoryId: 'user-memory' } }
    const threadEntry = { metadata: { scope: 'thread', memoryId: 'thread-memory' } }

    expect(memoryRagEntryMatchesScope(userEntry, 'all')).toBe(true)
    expect(memoryRagEntryMatchesScope(userEntry, 'user')).toBe(true)
    expect(memoryRagEntryMatchesScope(userEntry, 'thread')).toBe(false)
    expect(memoryRagEntryMatchesScope(threadEntry, 'thread')).toBe(true)
  })
})
