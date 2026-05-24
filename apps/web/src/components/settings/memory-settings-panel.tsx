import { formatDistanceToNow } from 'date-fns'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { FunctionReturnType } from 'convex/server'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ResponsiveSelectField } from '@/components/ui/responsive-select-field'
import { useProjects, useSettings, useThreads } from '@/hooks/use-chat-data'
import { InfiniteScrollTrigger } from '@/components/infinite-scroll-trigger'
import { usePaginatedQuery, useQuery } from '@/lib/convex-query-cache'

type MemoryScope = 'all' | 'user' | 'thread' | 'project'
type MemoryItem = FunctionReturnType<typeof api.functions.memory.listUserMemories>['page'][number]
type AggregatedMemoryItem = MemoryItem & {
  scope: 'user' | 'thread' | 'project'
}

function formatExtractionCost(cost: number | null) {
  if (cost == null) {
    return undefined
  }
  return `~$${cost.toFixed(4)}/run`
}

export function MemorySettingsPanel() {
  const { threads } = useThreads()
  const { projects } = useProjects()
  const { settings, updateSettings } = useSettings()
  const [scope, setScope] = useState<MemoryScope>('all')
  const [searchValue, setSearchValue] = useState('')

  const auxiliaryCandidates = useQuery(api.auxiliaryModels.listAuxiliaryModelCandidates, {})

  const auxiliaryModelOptions = useMemo(() => {
    const candidates = auxiliaryCandidates ?? []
    const recommended = candidates.find((candidate) => candidate.isRecommended)
    const options = candidates.map((candidate) => ({
      value: candidate.modelDocId,
      label: candidate.displayName,
      description: formatExtractionCost(candidate.estimatedCostPerExtraction),
    }))

    if (recommended) {
      return options
    }

    return options
  }, [auxiliaryCandidates])

  const selectedAuxiliaryModelId =
    settings?.auxiliaryModelId &&
    auxiliaryModelOptions.some((option) => option.value === settings.auxiliaryModelId)
      ? settings.auxiliaryModelId
      : auxiliaryModelOptions.find((option) =>
          auxiliaryCandidates?.some(
            (candidate) => candidate.modelDocId === option.value && candidate.isRecommended,
          ),
        )?.value

  const userMemories = usePaginatedQuery(
    api.functions.memory.listUserMemories,
    {},
    { initialNumItems: 25 },
  )
  const threadMemories = usePaginatedQuery(
    api.functions.memory.listThreadMemories,
    {},
    { initialNumItems: 25 },
  )
  const projectMemories = usePaginatedQuery(
    api.functions.memory.listProjectMemories,
    {},
    { initialNumItems: 25 },
  )

  const allMemories = useMemo<AggregatedMemoryItem[]>(
    () =>
      [
        ...(userMemories.results ?? []).map((memory) => ({ ...memory, scope: 'user' as const })),
        ...(threadMemories.results ?? []).map((memory) => ({
          ...memory,
          scope: 'thread' as const,
        })),
        ...(projectMemories.results ?? []).map((memory) => ({
          ...memory,
          scope: 'project' as const,
        })),
      ].sort((a, b) => b.updatedAt - a.updatedAt),
    [projectMemories.results, threadMemories.results, userMemories.results],
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

  const canLoadMore =
    userMemories.status === 'CanLoadMore' ||
    threadMemories.status === 'CanLoadMore' ||
    projectMemories.status === 'CanLoadMore' ||
    userMemories.status === 'LoadingMore' ||
    threadMemories.status === 'LoadingMore' ||
    projectMemories.status === 'LoadingMore'
  const isLoadingMore =
    userMemories.status === 'LoadingMore' ||
    threadMemories.status === 'LoadingMore' ||
    projectMemories.status === 'LoadingMore'

  function loadMoreForScope() {
    if (scope === 'user' || scope === 'all') {
      userMemories.loadMore(25)
    }
    if (scope === 'thread' || scope === 'all') {
      threadMemories.loadMore(25)
    }
    if (scope === 'project' || scope === 'all') {
      projectMemories.loadMore(25)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Background memory model</p>
          <p className="text-sm text-muted-foreground">
            Used for saving and searching memory when your chat model does not support tools. Pick a
            small, fast model to save cost.
          </p>
        </div>
        <ResponsiveSelectField
          value={selectedAuxiliaryModelId ?? ''}
          onValueChange={(value) => {
            void updateSettings({ auxiliaryModelId: value as Id<'models'> })
          }}
          title="Background memory model"
          className="w-full"
          disabled={auxiliaryModelOptions.length === 0}
          placeholder={
            auxiliaryModelOptions.length === 0
              ? 'No tool-capable models available'
              : 'Choose background memory model'
          }
          options={auxiliaryModelOptions.map((option) => ({
            value: option.value,
            label: option.description ? `${option.label} (${option.description})` : option.label,
          }))}
        />
      </div>

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

      {filteredMemories.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No memories match this filter.
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-3">
            {filteredMemories.map((memory) => (
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
          <InfiniteScrollTrigger
            hasMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMoreForScope}
            loadingLabel="Loading more memories..."
          />
        </div>
      )}
    </div>
  )
}

function threadLabel(threads: ReturnType<typeof useThreads>['threads'], threadId: string) {
  return threads.find((thread) => thread.id === threadId)?.title || 'Thread'
}

function projectLabel(projects: Array<{ id: string; name: string }>, projectId: string) {
  return projects.find((project) => project.id === projectId)?.name || 'Project'
}
