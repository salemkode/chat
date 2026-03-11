'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Search, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useModels } from '@/offline/repositories'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface ModelSelectorProps {
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  className?: string
}

const STORAGE_KEY = 'selected-model-id'

export function ModelSelector({
  selectedModel: externalSelectedModel,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const { models, setFavorite } = useModels()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [internalSelectedModel, setInternalSelectedModel] = useState<string | undefined>(
    externalSelectedModel,
  )

  useEffect(() => {
    if (externalSelectedModel !== undefined) {
      setInternalSelectedModel(externalSelectedModel)
    }
  }, [externalSelectedModel])

  useEffect(() => {
    if (typeof window === 'undefined' || externalSelectedModel) return
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setInternalSelectedModel(stored)
      onModelChange?.(stored)
    }
  }, [externalSelectedModel, onModelChange])

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models
    const query = searchQuery.toLowerCase()
    return models.filter(
      (model) =>
        model.displayName.toLowerCase().includes(query) ||
        model.modelId.toLowerCase().includes(query) ||
        model.description?.toLowerCase().includes(query),
    )
  }, [models, searchQuery])

  const currentModel = models.find(
    (model) => model.modelId === (externalSelectedModel ?? internalSelectedModel),
  )

  const handleSelect = (modelId: string) => {
    setInternalSelectedModel(modelId)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, modelId)
    }
    onModelChange?.(modelId)
    setOpen(false)
  }

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
          <Sparkles className="size-4" />
          <span className="font-medium">
            {currentModel?.displayName || 'Select model'}
          </span>
          <ChevronDown className="size-4 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0 overflow-hidden" side="top" align="start">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
              placeholder="Search models"
            />
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-2">
          {filteredModels.map((model) => {
            const isSelected =
              model.modelId === (externalSelectedModel ?? internalSelectedModel)
            return (
              <div
                key={model.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  isSelected
                    ? 'bg-muted text-foreground'
                    : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(model.modelId)}
                  className="flex flex-1 items-start text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.displayName}</span>
                      {isSelected ? <Check className="size-4 text-primary" /> : null}
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
                  <Star className={cn('size-4', model.isFavorite && 'fill-current')} />
                </button>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
