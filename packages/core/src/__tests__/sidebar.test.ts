import { describe, expect, it } from 'vitest'
import {
  compareThreadsForSidebar,
  groupThreadsByProject,
  groupThreadsByRelativeDate,
} from '../sidebar'

describe('compareThreadsForSidebar', () => {
  it('sorts pinned threads before unpinned', () => {
    const pinned = {
      id: '1',
      title: 'Pinned',
      sortOrder: 1,
      lastMessageAt: 100,
    }
    const unpinned = {
      id: '2',
      title: 'Unpinned',
      sortOrder: 0,
      lastMessageAt: 200,
    }
    expect(compareThreadsForSidebar(pinned, unpinned)).toBeLessThan(0)
    expect(compareThreadsForSidebar(unpinned, pinned)).toBeGreaterThan(0)
  })

  it('sorts by lastMessageAt descending when sortOrder is equal', () => {
    const newer = {
      id: '1',
      title: 'Newer',
      sortOrder: 0,
      lastMessageAt: 300,
    }
    const older = {
      id: '2',
      title: 'Older',
      sortOrder: 0,
      lastMessageAt: 100,
    }
    expect(compareThreadsForSidebar(newer, older)).toBeLessThan(0)
  })

  it('falls back to pinned boolean when sortOrder is undefined', () => {
    const pinned = {
      id: '1',
      title: 'Pinned',
      pinned: true,
      lastMessageAt: 50,
    }
    const unpinned = {
      id: '2',
      title: 'Unpinned',
      pinned: false,
      lastMessageAt: 500,
    }
    expect(compareThreadsForSidebar(pinned, unpinned)).toBeLessThan(0)
  })
})

describe('groupThreadsByProject', () => {
  it('groups threads by projectId and separates unfiled', () => {
    const threads = [
      {
        id: 't1',
        title: 'Project chat 1',
        projectId: 'p1',
        projectName: 'Alpha',
        sortOrder: 0,
        lastMessageAt: 10,
      },
      {
        id: 't2',
        title: 'Project chat 2',
        projectId: 'p1',
        projectName: 'Alpha',
        sortOrder: 1,
        lastMessageAt: 5,
      },
      {
        id: 't3',
        title: 'Other project',
        projectId: 'p2',
        projectName: 'Beta',
        sortOrder: 0,
        lastMessageAt: 20,
      },
      {
        id: 't4',
        title: 'Loose chat',
        sortOrder: 0,
        lastMessageAt: 15,
      },
    ]

    const { projectThreads, unfiledThreads } = groupThreadsByProject(threads)

    expect(projectThreads.get('p1')?.map((t) => t.id)).toEqual(['t2', 't1'])
    expect(projectThreads.get('p2')?.map((t) => t.id)).toEqual(['t3'])
    expect(unfiledThreads.map((t) => t.id)).toEqual(['t4'])
  })

  it('returns empty groups when no threads', () => {
    const { projectThreads, unfiledThreads } = groupThreadsByProject([])
    expect(projectThreads.size).toBe(0)
    expect(unfiledThreads).toEqual([])
  })

  it('handles all threads unfiled', () => {
    const threads = [
      { id: 't1', title: 'A', sortOrder: 0, lastMessageAt: 10 },
      { id: 't2', title: 'B', sortOrder: 0, lastMessageAt: 20 },
    ]
    const { projectThreads, unfiledThreads } = groupThreadsByProject(threads)
    expect(projectThreads.size).toBe(0)
    expect(unfiledThreads.map((t) => t.id)).toEqual(['t2', 't1'])
  })

  it('handles all threads in projects', () => {
    const threads = [
      { id: 't1', title: 'A', projectId: 'p1', sortOrder: 0, lastMessageAt: 10 },
      { id: 't2', title: 'B', projectId: 'p2', sortOrder: 0, lastMessageAt: 20 },
    ]
    const { projectThreads, unfiledThreads } = groupThreadsByProject(threads)
    expect(projectThreads.size).toBe(2)
    expect(unfiledThreads).toEqual([])
  })
})

describe('groupThreadsByRelativeDate', () => {
  it('groups threads into today, yesterday, and older', () => {
    const now = new Date(2026, 0, 15, 12, 0, 0).getTime()
    const todayMs = new Date(2026, 0, 15, 8, 0, 0).getTime()
    const yesterdayMs = new Date(2026, 0, 14, 8, 0, 0).getTime()
    const weekAgoMs = new Date(2026, 0, 10, 8, 0, 0).getTime()

    const threads = [
      { id: 't1', title: 'Today', sortOrder: 0, lastMessageAt: todayMs },
      { id: 't2', title: 'Yesterday', sortOrder: 0, lastMessageAt: yesterdayMs },
      { id: 't3', title: 'Week ago', sortOrder: 0, lastMessageAt: weekAgoMs },
    ]

    const groups = groupThreadsByRelativeDate(threads, now)
    expect(groups.map((g) => g.label)).toEqual([
      'Today',
      'Yesterday',
      'Previous 7 Days',
    ])
    expect(groups[0].threads.map((t) => t.id)).toEqual(['t1'])
    expect(groups[1].threads.map((t) => t.id)).toEqual(['t2'])
    expect(groups[2].threads.map((t) => t.id)).toEqual(['t3'])
  })
})
