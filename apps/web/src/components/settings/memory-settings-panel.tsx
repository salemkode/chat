import { formatDistanceToNow } from 'date-fns'
import { api } from '@convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ResponsiveSelectField } from '@/components/ui/responsive-select-field'
import { useProjects, useThreads } from '@/hooks/use-chat-data'
import { useQuery } from '@/lib/convex-query-cache'

type MemoryScope = 'all' | 'user' | 'thread' | 'project'
type MemoryItem = FunctionReturnType<typeof api.functions.memory.listUserMemories>['page'][number]
type AggregatedMemoryItem = MemoryItem & {
  scope: 'user' | 'thread' | 'project'
}

export function MemorySettingsPanel() {
  const { threads } = useThreads()
  const { projects } = useProjects()
  const [scope, setScope] = useState<MemoryScope>('all')
  const [searchValue, setSearchValue] = useState('')

  const userMemories = useQuery(api.functions.memory.listUserMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
  })
  const threadMemories = useQuery(api.functions.memory.listThreadMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
  })
  const projectMemories = useQuery(api.functions.memory.listProjectMemories, {
    paginationOpts: { cursor: null, numItems: 200 },
  })

  const allMemories = useMemo<AggregatedMemoryItem[]>(
    () =>
      [
        ...(userMemories?.page ?? []).map((memory) => ({ ...memory, scope: 'user' as const })),
        ...(threadMemories?.page ?? []).map((memory) => ({ ...memory, scope: 'thread' as const })),
        ...(projectMemories?.page ?? []).map((memory) => ({ ...memory, scope: 'project' as const })),
      ].sort((a, b) => b.updatedAt - a.updatedAt),
    [projectMemories?.page, threadMemories?.page, userMemories?.page],
  )

  const filteredMemories = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase()

    return allMemories.filter((memory) => {
      if (scope !== 'all' && memory.scope !== scope) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      const haystack = [
        memory.title,
        memory.content,
        memory.category,
        memory.source,
        ...(memory.tags ?? []),
        memory.threadId ? threadLabel(threads, memory.threadId) : null,
        memory.projectId ? projectLabel(projects, memory.projectId) : null,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
  }, [allMemories, projects, scope, searchValue, threads])

  const displayedMemories = filteredMemories.slice(0, 50)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-stretch">
        <ResponsiveSelectField
          value={scope}
          onValueChange={(value) => setScope(value as MemoryScope)}
          title="Scope"
          className="w-full"
          options={[
            { value: 'all', label: 'All' },
            { value: 'user', label: 'User' },
            { value: 'thread', label: 'Thread' },
            { value: 'project', label: 'Project' },
          ]}
        />
        <Input
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search memories…"
          className="w-full"
        />
      </div>

      {displayedMemories.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No memories match this filter.
        </div>
      ) : (
        <ul className="space-y-3">
          {displayedMemories.map((memory) => (
            <li
              key={`${memory.scope}:${memory.memoryId}`}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{memory.title}</h3>
                    <Badge variant="secondary">{memory.scope}</Badge>
                    {memory.category ? <Badge variant="outline">{memory.category}</Badge> : null}
                  </div>
                  <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                    {memory.content}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(memory.updatedAt), { addSuffix: true })}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{memory.source}</Badge>
                {memory.threadId ? (
                  <Badge variant="outline">{threadLabel(threads, memory.threadId)}</Badge>
                ) : null}
                {memory.projectId ? (
                  <Badge variant="outline">{projectLabel(projects, memory.projectId)}</Badge>
                ) : null}
                {(memory.tags ?? []).slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function threadLabel(
  threads: ReturnType<typeof useThreads>['threads'],
  threadId: string,
) {
  return threads.find((thread) => thread.id === threadId)?.title || 'Thread'
}

function projectLabel(
  projects: Array<{ id: string; name: string }>,
  projectId: string,
) {
  return projects.find((project) => project.id === projectId)?.name || 'Project'
}
