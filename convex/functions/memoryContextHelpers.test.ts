import { describe, expect, it } from 'vitest'
import { dedupeMemoryHitsByPriority } from './memoryContextHelpers'

describe('dedupeMemoryHitsByPriority', () => {
  it('keeps higher-priority hits and removes duplicates from later groups', () => {
    const [projectHits, threadHits, userHits] = dedupeMemoryHitsByPriority([
      [
        { contentHash: 'a', title: 'Project A' },
        { contentHash: 'b', title: 'Project B' },
      ],
      [
        { contentHash: 'b', title: 'Thread duplicate' },
        { contentHash: 'c', title: 'Thread unique' },
      ],
      [
        { contentHash: 'a', title: 'User duplicate' },
        { contentHash: 'd', title: 'User unique' },
      ],
    ])

    expect(projectHits.map((hit) => hit.title)).toEqual([
      'Project A',
      'Project B',
    ])
    expect(threadHits.map((hit) => hit.title)).toEqual(['Thread unique'])
    expect(userHits.map((hit) => hit.title)).toEqual(['User unique'])
  })
})
