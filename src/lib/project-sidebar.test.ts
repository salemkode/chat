import { describe, expect, it } from 'vitest'
import {
  filterProjectsBySearch,
  filterThreadsBySearch,
  groupThreadsByProject,
} from './project-sidebar'

describe('project-sidebar helpers', () => {
  it('keeps higher sort indexes first when grouping project threads', () => {
    const { projectThreads, unfiledThreads } = groupThreadsByProject([
      {
        id: 't1',
        title: 'Alpha 1',
        projectId: 'p1',
        projectName: 'Alpha',
        sortOrder: 1,
        lastMessageAt: 10,
      },
      {
        id: 't2',
        title: 'Alpha 2',
        projectId: 'p1',
        projectName: 'Alpha',
        sortOrder: 0,
        lastMessageAt: 20,
      },
      {
        id: 't3',
        title: 'Loose chat',
        sortOrder: 1,
        lastMessageAt: 15,
      },
      {
        id: 't4',
        title: 'Loose chat newer',
        sortOrder: 0,
        lastMessageAt: 25,
      },
    ])

    expect(projectThreads.get('p1')?.map((thread) => thread.id)).toEqual([
      't1',
      't2',
    ])
    expect(unfiledThreads.map((thread) => thread.id)).toEqual(['t3', 't4'])
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
