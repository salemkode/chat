import { describe, expect, it } from 'vitest'
import {
  filterProjectsBySearch,
  filterThreadsBySearch,
  groupThreadsByProject,
} from './project-sidebar'

describe('project-sidebar helpers', () => {
  it('groups project threads separately from unfiled chats and sorts by recency', () => {
    const { projectThreads, unfiledThreads } = groupThreadsByProject([
      {
        id: 't1',
        title: 'Alpha 1',
        projectId: 'p1',
        projectName: 'Alpha',
        lastMessageAt: 10,
      },
      {
        id: 't2',
        title: 'Alpha 2',
        projectId: 'p1',
        projectName: 'Alpha',
        lastMessageAt: 20,
      },
      {
        id: 't3',
        title: 'Loose chat',
        lastMessageAt: 15,
      },
    ])

    expect(projectThreads.get('p1')?.map((thread) => thread.id)).toEqual([
      't2',
      't1',
    ])
    expect(unfiledThreads.map((thread) => thread.id)).toEqual(['t3'])
  })

  it('filters projects and threads by the search query', () => {
    expect(
      filterProjectsBySearch(
        [
          { id: 'p1', name: 'Roadmap', description: 'Launch work' },
          { id: 'p2', name: 'Finance', description: 'Budget planning' },
        ],
        'launch',
      ).map((project) => project.id),
    ).toEqual(['p1'])

    expect(
      filterThreadsBySearch(
        [
          {
            id: 't1',
            title: 'Deployment checklist',
            projectId: 'p1',
            projectName: 'Roadmap',
            lastMessageAt: 1,
          },
          {
            id: 't2',
            title: 'Quarterly expenses',
            projectId: 'p2',
            projectName: 'Finance',
            lastMessageAt: 2,
          },
        ],
        'finance',
      ).map((thread) => thread.id),
    ).toEqual(['t2'])
  })
})
