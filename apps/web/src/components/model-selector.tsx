'use client'

import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModels } from '@/hooks/use-chat-data'
import { EntityIcon } from '@/components/admin/entity-icon'
import { ModelCapabilityBadges } from '@/components/model-capability-badges'
import {
  modelSelectorIconTileClass,
  modelSelectorOptionRowClass,
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

const ModelSelectorTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'>
>(function ModelSelectorTrigger(
  { className, type: _type, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex items-center gap-2 rounded-xl border border-transparent px-2.5 py-1.5 text-sm transition-colors',
        'hover:border-border/60 hover:bg-muted/50',
        'text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
})

export function ModelSelector({
  selectedModel,
  onModelChange,
  className,
}: {
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  className?: string
}) {
  const { models } = useModels()
  const [open, setOpen] = useState(false)
  const currentModel = models.find(
    (model: OfflineModelRecord) => model.modelId === selectedModel,
  )

  const triggerInner = (
    <>
      {currentModel ? (
        <EntityIcon
          icon={currentModel.icon || currentModel.provider?.icon}
          iconType={(currentModel.iconType || currentModel.provider?.iconType) as
            | 'emoji'
            | 'lucide'
            | 'upload'
            | undefined}
          iconUrl={currentModel.iconUrl || currentModel.provider?.iconUrl}
          className="size-4"
        />
      ) : (
        <Sparkles className="size-4" />
      )}
      <span className="max-w-[200px] truncate font-medium">
        {currentModel?.displayName || 'Select model'}
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground/60" />
    </>
  )

  const panel = (
    <ModelSelectorPanel
      selectedModel={selectedModel}
      onSelectModel={(modelId) => {
        onModelChange?.(modelId)
        setOpen(false)
      }}
      className="min-h-0 flex-1"
    />
  )

  return (
    <div className={className}>
      <ResponsivePopup open={open} onOpenChange={setOpen}>
        <ResponsivePopupTrigger asChild>
          <ModelSelectorTrigger>{triggerInner}</ModelSelectorTrigger>
        </ResponsivePopupTrigger>
        <ResponsivePopupContent
          size="medium"
          className="h-[min(520px,75vh)] w-[min(92vw,420px)] max-w-[420px] overflow-hidden p-0"
          side="top"
          align="start"
        >
          {panel}
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
  const { models, setFavorite } = useModels()
  const [searchQuery, setSearchQuery] = useState('')
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const previousRects = useRef(new Map<string, DOMRect>())

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models
    const query = searchQuery.toLowerCase()
    return models.filter(
      (model: OfflineModelRecord) =>
        model.displayName.toLowerCase().includes(query) ||
        model.modelId.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query) ||
        model.capabilities?.some((c) => c.toLowerCase().includes(query)),
    )
  }, [models, searchQuery])

  const groupedModels = useMemo<Array<[string, OfflineModelRecord[]]>>(() => {
    const groups = new Map<string, OfflineModelRecord[]>()
    for (const model of filteredModels) {
      const providerName = model.provider?.name || 'Other providers'
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

  const modelIds = useMemo(
    () =>
      groupedModels.flatMap(([, providerModels]) =>
        providerModels.map((model) => model.id),
      ),
    [groupedModels],
  )

  useLayoutEffect(() => {
    const currentRects = new Map<string, DOMRect>()
    const activeIds = new Set(modelIds)

    for (const modelId of modelIds) {
      const node = rowRefs.current.get(modelId)
      if (!node) continue
      currentRects.set(modelId, node.getBoundingClientRect())
    }

    for (const [modelId, node] of rowRefs.current.entries()) {
      if (!activeIds.has(modelId)) {
        rowRefs.current.delete(modelId)
        continue
      }

      const currentRect = currentRects.get(modelId)
      if (!currentRect) continue

      const previousRect = previousRects.current.get(modelId)
      if (!previousRect) {
        node.animate(
          [
            { opacity: 0, transform: 'translateY(-8px) scale(0.985)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ],
          {
            duration: 180,
            easing: 'cubic-bezier(.16,1,.3,1)',
          },
        )
        continue
      }

      const deltaY = previousRect.top - currentRect.top
      if (Math.abs(deltaY) < 1) continue

      node.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: 'translateY(0px)' },
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(.2,0,0,1)',
        },
      )
    }

    previousRects.current = currentRects
  }, [modelIds])

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/80 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-border/60 bg-muted/40 py-2 pr-4 pl-9 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/25"
            placeholder="Search models or capabilities"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {groupedModels.map(([providerName, providerModels]) => (
          <div key={providerName} className="mb-3 last:mb-0">
            <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {providerName}
            </div>
            <div className="space-y-1.5">
              {providerModels.map((model: OfflineModelRecord) => {
                const isSelected = model.modelId === selectedModel

                return (
                  <div
                    key={model.id}
                    ref={(node) => {
                      if (node) {
                        rowRefs.current.set(model.id, node)
                        return
                      }
                      rowRefs.current.delete(model.id)
                    }}
                    className="will-change-transform"
                  >
                    <div className={modelSelectorOptionRowClass(isSelected)}>
                      <button
                        type="button"
                        onClick={() => onSelectModel?.(model.modelId)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <div className={modelSelectorIconTileClass()}>
                          <EntityIcon
                            icon={model.icon || model.provider?.icon}
                            iconType={(model.iconType ||
                              model.provider?.iconType) as
                              | 'emoji'
                              | 'lucide'
                              | 'upload'
                              | undefined}
                            iconUrl={model.iconUrl || model.provider?.iconUrl}
                            className="size-4"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{model.displayName}</span>
                            {model.isFree ? (
                              <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                Free
                              </span>
                            ) : null}
                            {isSelected ? (
                              <Sparkles className="size-4 shrink-0 text-primary" />
                            ) : null}
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                            {model.modelId}
                          </div>
                          <ModelCapabilityBadges
                            capabilities={model.capabilities}
                            className="mt-1.5"
                          />
                        </div>
                      </button>

                      <button
                        type="button"
                        className={cn(
                          'shrink-0 rounded-lg p-1.5 transition-colors',
                          model.isFavorite
                            ? 'text-amber-500'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        onClick={(event) => {
                          event.stopPropagation()
                          void setFavorite(model.id, !model.isFavorite)
                        }}
                        aria-label={
                          model.isFavorite ? 'Remove favorite' : 'Add favorite'
                        }
                      >
                        <Star
                          className={cn('size-4', model.isFavorite && 'fill-current')}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
