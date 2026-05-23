'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AUTO_MODEL_ID,
  encodeAutoModelCollectionSelection,
  isAutoModelSelection,
  parseAutoModelCollectionSelection,
} from '@chat/shared'
import { Boxes, Check, ChevronDown, Search, Star } from '@/lib/icons'
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
  const { models, collections } = useModels()
  const [open, setOpen] = useState(false)
  const autoSelected = isAutoModelSelection(selectedModel)
  const currentModel = models.find((model: OfflineModelRecord) => model.modelId === selectedModel)
  const selectedCollectionId = parseAutoModelCollectionSelection(selectedModel)
  const selectedCollection = selectedCollectionId
    ? collections.find((collection) => collection.id === selectedCollectionId)
    : undefined
  const autoLabel = selectedCollection?.name ? `Auto (${selectedCollection.name})` : 'Auto'

  return (
    <div className={className}>
      <ResponsivePopup open={open} onOpenChange={setOpen}>
        <ResponsivePopupTrigger asChild>
          <ModelSelectorTrigger
            type="button"
            variant="outline"
            className="h-9 max-w-full justify-start gap-2 rounded-full px-2.5 font-normal"
          >
            {autoSelected && selectedCollection ? (
              <EntityIcon
                icon={selectedCollection.icon}
                iconType={selectedCollection.iconType}
                iconUrl={selectedCollection.iconUrl}
                className="size-4 shrink-0"
              />
            ) : null}
            {!autoSelected && currentModel ? (
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
              {autoSelected ? autoLabel : currentModel?.displayName || 'Model'}
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
  const { models, collections, setFavorite, autoModelAvailable, hasMore, isLoadingMore, loadMore } =
    useModels()
  const [searchQuery, setSearchQuery] = useState('')
  const selectedCollectionId = parseAutoModelCollectionSelection(selectedModel)
  const [activeCategory, setActiveCategory] = useState<string>(selectedCollectionId ?? 'all')
  const sortedCollections = useMemo(
    () =>
      [...collections].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
      ),
    [collections],
  )
  const activeCollection = useMemo(
    () =>
      activeCategory !== 'all' && activeCategory !== 'favorites'
        ? sortedCollections.find((collection) => collection.id === activeCategory)
        : undefined,
    [activeCategory, sortedCollections],
  )

  useEffect(() => {
    if (selectedCollectionId) {
      setActiveCategory(selectedCollectionId)
    }
  }, [selectedCollectionId])

  const baseVisibleModels = useMemo(() => {
    if (activeCategory === 'favorites') {
      return models.filter((model) => model.isFavorite)
    }
    if (!activeCollection) {
      return models
    }

    const allowedModelIds = new Set(activeCollection.modelIds)
    return models.filter((model) => allowedModelIds.has(model.id))
  }, [activeCategory, activeCollection, models])

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) {
      return baseVisibleModels
    }
    const query = searchQuery.toLowerCase()
    return baseVisibleModels.filter(
      (model: OfflineModelRecord) =>
        model.displayName.toLowerCase().includes(query) ||
        model.modelId.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.provider?.name?.toLowerCase().includes(query) ||
        model.capabilities?.some((capability) => capability.toLowerCase().includes(query)),
    )
  }, [baseVisibleModels, searchQuery])

  const orderedModels = useMemo(() => {
    const collectionOrder = activeCollection
      ? new Map(activeCollection.modelIds.map((modelId, index) => [modelId, index]))
      : null

    return [...filteredModels].sort((left, right) => {
      const leftCollectionOrder = collectionOrder?.get(left.id)
      const rightCollectionOrder = collectionOrder?.get(right.id)
      if (leftCollectionOrder !== undefined && rightCollectionOrder !== undefined) {
        return leftCollectionOrder - rightCollectionOrder
      }
      if (left.isFavorite !== right.isFavorite) {
        return left.isFavorite ? -1 : 1
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder
      }
      return left.displayName.localeCompare(right.displayName)
    })
  }, [activeCollection, filteredModels])

  const empty = orderedModels.length === 0
  const autoAllSelected = selectedModel === AUTO_MODEL_ID
  const autoCollectionSelected = activeCollection
    ? selectedModel === encodeAutoModelCollectionSelection(activeCollection.id)
    : false

  return (
    <div className={cn('flex min-h-0 overflow-hidden', className)}>
      <div className="flex w-16 shrink-0 flex-col border-r border-border/80 bg-[linear-gradient(180deg,rgba(19,17,26,0.96)_0%,rgba(20,18,27,0.92)_100%)] px-2 py-3">
        <div className="flex flex-1 flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl border transition-colors',
              activeCategory === 'all'
                ? 'border-white/15 bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)]'
                : 'border-white/8 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/90',
            )}
            aria-label="All models"
          >
            <Boxes className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('favorites')}
            className={cn(
              'flex size-11 items-center justify-center rounded-2xl border transition-colors',
              activeCategory === 'favorites'
                ? 'border-white/15 bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)]'
                : 'border-white/8 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/90',
            )}
            aria-label="Favorite models"
          >
            <Star className="size-4" />
          </button>

          <div className="my-1 h-px w-8 bg-white/10" />

          {sortedCollections.map((collection) => {
            const isActive = activeCategory === collection.id
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => setActiveCategory(collection.id)}
                className={cn(
                  'flex size-11 items-center justify-center rounded-2xl border transition-colors',
                  isActive
                    ? 'border-white/15 bg-white/10 text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)]'
                    : 'border-white/8 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white/90',
                )}
                aria-label={collection.name}
                title={collection.name}
              >
                {collection.icon || collection.iconUrl ? (
                  <EntityIcon
                    icon={collection.icon}
                    iconType={collection.iconType}
                    iconUrl={collection.iconUrl}
                    className="size-4"
                  />
                ) : (
                  <span className="text-xs font-semibold uppercase">
                    {collection.name.slice(0, 1)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(244,233,255,0.12),transparent_40%),linear-gradient(180deg,rgba(23,20,31,0.98)_0%,rgba(19,17,26,0.98)_100%)]">
        <div className="shrink-0 border-b border-white/6 px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/45" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 rounded-full border-white/8 bg-white/[0.04] pl-9 text-sm text-white placeholder:text-white/35 focus-visible:border-white/12 focus-visible:ring-white/15"
              placeholder="Search models..."
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {activeCategory === 'favorites'
                  ? 'Favorites'
                  : activeCollection?.name ?? 'All models'}
              </p>
              <p className="text-[11px] text-white/45">
                {activeCategory === 'favorites'
                  ? 'Your starred models across the catalog.'
                  : activeCollection?.description || 'Collections now shape browsing instead of providers.'}
              </p>
            </div>
            <div className={cn('hidden sm:inline-flex', modelFilterPillClass(false), 'border-white/10 bg-white/[0.04] text-white/70')}>
              {orderedModels.length} shown
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {autoModelAvailable ? (
            <div className="mb-4">
              <div className={cn(modelSectionLabelClass(), 'text-white/45')}>Routing</div>
              <div className={modelRowClass(autoAllSelected)}>
                <Button
                  type="button"
                  variant="plain"
                  size="none"
                  onClick={() => onSelectModel?.(AUTO_MODEL_ID)}
                  className="flex min-w-0 flex-1 items-start gap-2 rounded-full px-1 py-0.5 text-left hover:bg-transparent"
                >
                  <div className={modelIconTileClass(autoAllSelected)}>
                    <span className="text-sm font-semibold">A</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-white">Auto</span>
                      {autoAllSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                    </div>
                    <p className="truncate text-[11px] text-white/45">
                      Let the router choose from the full visible catalog.
                    </p>
                  </div>
                </Button>
              </div>

              {activeCollection ? (
                <div className="mt-2">
                  <div className={modelRowClass(autoCollectionSelected)}>
                    <Button
                      type="button"
                      variant="plain"
                      size="none"
                      onClick={() =>
                        onSelectModel?.(encodeAutoModelCollectionSelection(activeCollection.id))
                      }
                      className="flex min-w-0 flex-1 items-start gap-2 rounded-full px-1 py-0.5 text-left hover:bg-transparent"
                    >
                      <div className={modelIconTileClass(autoCollectionSelected)}>
                        <EntityIcon
                          icon={activeCollection.icon}
                          iconType={activeCollection.iconType}
                          iconUrl={activeCollection.iconUrl}
                          className="size-4"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-white">
                            Auto ({activeCollection.name})
                          </span>
                          {autoCollectionSelected ? (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] text-white/45">
                          Route only inside this collection.
                        </p>
                      </div>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {empty ? (
            <p className="px-2 py-8 text-center text-sm text-white/45">No models match.</p>
          ) : (
            <div className="space-y-0.5">
              {orderedModels.map((model: OfflineModelRecord) => {
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
                          iconType={model.iconType || model.provider?.iconType}
                          iconUrl={model.iconUrl || model.provider?.iconUrl}
                          className="size-4"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-white">
                            {model.displayName}
                          </span>
                          {model.provider?.name ? (
                            <span className="truncate text-[11px] text-white/35">
                              {model.provider.name}
                            </span>
                          ) : null}
                          {isSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                        </div>
                        <p className="truncate font-mono text-[10px] text-white/40">{model.modelId}</p>
                        <ModelCapabilityBadges capabilities={model.capabilities} className="mt-1" />
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant="plain"
                      size="none"
                      className={cn(
                        'shrink-0 text-white/40 hover:text-amber-300',
                        model.isFavorite && 'text-amber-300',
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
          )}
          {hasMore ? (
            <div className="px-2 pt-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                onClick={() => loadMore(40)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading more models...' : 'Load more models'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
