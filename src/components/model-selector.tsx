'use client'

import { forwardRef, useMemo, useState } from 'react'
import { ChevronDown, Search, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModels } from '@/hooks/use-chat-data'
import { EntityIcon } from '@/components/admin/entity-icon'
import { ModelCapabilityBadges } from '@/components/model-capability-badges'
import {
  modelSelectorIconTileClass,
  modelSelectorOptionRowClass,
} from '@/lib/model-selector-ui'
import { AdaptiveDialog } from '@/components/ui/adaptive-dialog'
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
      <ModelSelectorTrigger onClick={() => setOpen(true)}>
        {triggerInner}
      </ModelSelectorTrigger>
      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Choose a model"
        description="Search providers and pick an AI model for this chat."
      >
        {panel}
      </AdaptiveDialog>
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

  const groupedModels = useMemo(() => {
    const groups = new Map<string, OfflineModelRecord[]>()
    for (const model of filteredModels) {
      const providerName = model.provider?.name || 'Other providers'
      const group = groups.get(providerName) ?? []
      group.push(model)
      groups.set(providerName, group)
    }

    return [...groups.entries()]
  }, [filteredModels])

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
                    className={modelSelectorOptionRowClass(isSelected)}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectModel?.(model.modelId)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div className={modelSelectorIconTileClass()}>
                        <EntityIcon
                          icon={model.icon || model.provider?.icon}
                          iconType={(model.iconType || model.provider?.iconType) as
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
                        {model.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                            {model.description}
                          </p>
                        ) : null}
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
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
