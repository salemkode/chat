'use client'

import { useMemo, useState } from 'react'
import { AUTO_MODEL_ID, isAutoModelSelection } from '@chat/shared'
import { Check, ChevronDown, Search, Star } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useModels } from '@/hooks/use-chat-data'
import { EntityIcon } from '@/components/admin/entity-icon'
import { ModelCapabilityBadges } from '@/components/model-capability-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  modelFilterPillClass,
  modelIconTileClass,
  modelRowClass,
  modelSectionLabelClass,
} from '@/lib/model-selector-ui'
import {
  ResponsivePopup,
  ResponsivePopupContent,
  ResponsivePopupTrigger,
} from '@/components/ui/responsive-overlay'
import type { OfflineModelRecord } from '@/offline/schema'

type ModelSelectorPanelProps = {
  selectedModel?: string
  onSelectModel?: (modelId: string) => void
  className?: string
}

const ModelSelectorTrigger = Button

export function ModelSelector({
  selectedModel,
  onModelChange,
  className,
}: {
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  className?: string
}) {
  const { models, autoModelAvailable } = useModels()
  const [open, setOpen] = useState(false)
  const autoSelected = isAutoModelSelection(selectedModel)
  const currentModel = models.find((model: OfflineModelRecord) => model.modelId === selectedModel)

  return (
    <div className={className}>
      <ResponsivePopup open={open} onOpenChange={setOpen}>
        <ResponsivePopupTrigger asChild>
          <ModelSelectorTrigger
            type="button"
            variant="outline"
            className="h-9 max-w-full justify-start gap-2 rounded-full px-2.5 font-normal"
          >
            {autoSelected ? null : currentModel ? (
              <EntityIcon
                icon={currentModel.icon || currentModel.provider?.icon}
                iconType={
                  (currentModel.iconType || currentModel.provider?.iconType) as
                    | 'emoji'
                    | 'phosphor'
                    | 'upload'
                    | undefined
                }
                iconUrl={currentModel.iconUrl || currentModel.provider?.iconUrl}
                className="size-4 shrink-0"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-left text-sm">
              {autoSelected ? 'Auto' : currentModel?.displayName || 'Model'}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </ModelSelectorTrigger>
        </ResponsivePopupTrigger>
        <ResponsivePopupContent
          size="page"
          align="start"
          className="flex h-[min(420px,70dvh)] w-[min(100vw-1rem,22rem)] max-h-[70dvh] flex-col overflow-hidden rounded-4xl p-0 sm:w-96"
          side="top"
          sideOffset={8}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-sm font-medium">Models</p>
          </div>
          <ModelSelectorPanel
            selectedModel={selectedModel}
            onSelectModel={(modelId) => {
              onModelChange?.(modelId)
              setOpen(false)
            }}
            className="min-h-0 flex-1"
          />
        </ResponsivePopupContent>
      </ResponsivePopup>
    </div>
  )
}

export function ModelSelectorPanel({
  selectedModel,
  onSelectModel,
  className,
}: ModelSelectorPanelProps) {
  const { models, setFavorite, autoModelAvailable } = useModels()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'favorites'>('all')

  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return models
    const query = searchQuery.toLowerCase()
    return models.filter(
      (model: OfflineModelRecord) =>
        model.displayName.toLowerCase().includes(query) ||
        model.modelId.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.provider?.name?.toLowerCase().includes(query) ||
        model.capabilities?.some((c) => c.toLowerCase().includes(query)),
    )
  }, [models, searchQuery])

  const filteredModels = useMemo(() => {
    if (filterTab === 'favorites') {
      return searchFiltered.filter((m: OfflineModelRecord) => m.isFavorite)
    }
    return searchFiltered
  }, [filterTab, searchFiltered])

  const groupedModels = useMemo<Array<[string, OfflineModelRecord[]]>>(() => {
    const groups = new Map<string, OfflineModelRecord[]>()
    for (const model of filteredModels) {
      const providerName = model.provider?.name || 'Other'
      const group = groups.get(providerName) ?? []
      group.push(model)
      groups.set(providerName, group)
    }

    return [...groups.entries()].map(([providerName, providerModels]) => {
      const sortedModels = [...providerModels].sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1
        }
        return a.displayName.localeCompare(b.displayName)
      })
      return [providerName, sortedModels]
    })
  }, [filteredModels])

  const empty = groupedModels.length === 0 || groupedModels.every(([, list]) => list.length === 0)
  const autoSelected = isAutoModelSelection(selectedModel)

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="shrink-0 space-y-2 border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 rounded-full border-0 bg-muted/50 pl-8 text-sm focus-visible:ring-1"
            placeholder="Search…"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={modelFilterPillClass(filterTab === 'all')}
            onClick={() => setFilterTab('all')}
          >
            All
          </button>
          <button
            type="button"
            className={modelFilterPillClass(filterTab === 'favorites')}
            onClick={() => setFilterTab('favorites')}
          >
            Favorites
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {autoModelAvailable ? (
          <div className="mb-4">
            <div className={modelSectionLabelClass()}>Routing</div>
            <div className={modelRowClass(autoSelected)}>
              <Button
                type="button"
                variant="plain"
                size="none"
                onClick={() => onSelectModel?.(AUTO_MODEL_ID)}
                className="flex min-w-0 flex-1 items-start gap-2 rounded-full px-1 py-0.5 text-left hover:bg-transparent"
              >
                <div className={modelIconTileClass(autoSelected)}>
                  <span className="text-sm font-semibold">A</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">Auto</span>
                    {autoSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Let the backend Python router choose the model.
                  </p>
                </div>
              </Button>
            </div>
          </div>
        ) : null}
        {empty ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            {filterTab === 'favorites' ? 'No favorites match.' : 'No models match.'}
          </p>
        ) : (
          groupedModels.map(([providerName, providerModels]) => (
            <div key={providerName} className="mb-4 last:mb-0">
              <div className={modelSectionLabelClass()}>{providerName}</div>
              <div className="space-y-0.5">
                {providerModels.map((model: OfflineModelRecord) => {
                  const isSelected = model.modelId === selectedModel
                  return (
                    <div key={model.id} className={modelRowClass(isSelected)}>
                      <Button
                        type="button"
                        variant="plain"
                        size="none"
                        onClick={() => onSelectModel?.(model.modelId)}
                        className="flex min-w-0 flex-1 items-start gap-2 rounded-full px-1 py-0.5 text-left hover:bg-transparent"
                      >
                        <div className={modelIconTileClass(isSelected)}>
                          <EntityIcon
                            icon={model.icon || model.provider?.icon}
                            iconType={
                              (model.iconType || model.provider?.iconType) as
                                | 'emoji'
                                | 'phosphor'
                                | 'upload'
                                | undefined
                            }
                            iconUrl={model.iconUrl || model.provider?.iconUrl}
                            className="size-4"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {model.displayName}
                            </span>
                            {isSelected ? (
                              <Check className="size-3.5 shrink-0 text-primary" />
                            ) : null}
                          </div>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">
                            {model.modelId}
                          </p>
                          <ModelCapabilityBadges
                            capabilities={model.capabilities}
                            className="mt-1"
                          />
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant="plain"
                        size="none"
                        className={cn(
                          'shrink-0 text-muted-foreground',
                          model.isFavorite && 'text-amber-600 dark:text-amber-400',
                        )}
                        onClick={(event) => {
                          event.stopPropagation()
                          void setFavorite(model.id, !model.isFavorite)
                        }}
                        aria-label={model.isFavorite ? 'Remove favorite' : 'Favorite'}
                      >
                        <Star className={cn('size-3.5', model.isFavorite && 'fill-current')} />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
