import { describe, expect, it } from 'vitest'
import { appendThreadsWithoutUsableMetadata } from './threadList'

describe('appendThreadsWithoutUsableMetadata', () => {
  it('keeps a real thread visible when metadata points at an invalid thread id', () => {
    const rows = appendThreadsWithoutUsableMetadata({
      metadataRows: [],
      metadataThreadIds: ['r57777nv9p1k0phbvanvw85ra586s200'],
      threads: [
        {
          _id: 'jt7bx4y0x8s9m4x4k6n2r2mcf97ayv8d',
          _creationTime: 123,
          title: 'Recovered thread',
          userId: 'user_1',
        },
      ],
    })

    expect(rows).toEqual([
      {
        _id: 'jt7bx4y0x8s9m4x4k6n2r2mcf97ayv8d',
        _creationTime: 123,
        lastMessageAt: 123,
        title: 'Recovered thread',
        userId: 'user_1',
        metadata: null,
        project: null,
      },
    ])
  })

  it('does not duplicate a thread that already has usable metadata', () => {
    const rows = appendThreadsWithoutUsableMetadata({
      metadataRows: [
        {
          _id: 'thread_1',
          _creationTime: 100,
          lastMessageAt: 200,
          title: 'With metadata',
          userId: 'user_1',
          metadata: { threadId: 'thread_1' },
          project: null,
        },
      ],
      metadataThreadIds: ['thread_1'],
      threads: [
        {
          _id: 'thread_1',
          _creationTime: 100,
          title: 'With metadata',
          userId: 'user_1',
        },
      ],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.metadata).toEqual({ threadId: 'thread_1' })
  })
})
