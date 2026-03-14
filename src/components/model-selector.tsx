'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Search, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModels } from '@/hooks/use-chat-data'
import { EntityIcon } from '@/components/admin/entity-icon'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { OfflineModelRecord } from '@/offline/schema'

type ModelSelectorPanelProps = {
  selectedModel?: string
  onSelectModel?: (modelId: string) => void
  className?: string
}

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
            'hover:bg-muted/40 transition-colors',
            'text-muted-foreground hover:text-foreground',
            className,
          )}
        >
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
          <span className="font-medium">
            {currentModel?.displayName || 'Select model'}
          </span>
          <ChevronDown className="size-4 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[360px] overflow-hidden p-0"
        side="top"
        align="start"
      >
        <ModelSelectorPanel
          selectedModel={selectedModel}
          onSelectModel={(modelId) => {
            onModelChange?.(modelId)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
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
        model.description?.toLowerCase().includes(query),
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
    <div className={className}>
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border-0 bg-muted/50 py-2 pr-4 pl-9 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Search models"
          />
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto p-2">
        {groupedModels.map(([providerName, providerModels]) => (
          <div key={providerName} className="mb-3 last:mb-0">
            <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {providerName}
            </div>
            <div className="space-y-1">
              {providerModels.map((model: OfflineModelRecord) => {
                const isSelected = model.modelId === selectedModel

                return (
                  <div
                    key={model.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      isSelected
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectModel?.(model.modelId)}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background">
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{model.displayName}</span>
                          {model.isFree ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                              Free
                            </span>
                          ) : null}
                          {isSelected ? (
                            <Sparkles className="size-4 text-primary" />
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {model.modelId}
                        </div>
                        {model.description ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {model.description}
                          </div>
                        ) : null}
                      </div>
                    </button>

                    <button
                      type="button"
                      className={cn(
                        'rounded-md p-1.5 transition-colors',
                        model.isFavorite
                          ? 'text-amber-500'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={(event) => {
                        event.stopPropagation()
                        void setFavorite(model.id, !model.isFavorite)
                      }}
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
