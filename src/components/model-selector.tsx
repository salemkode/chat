'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { cn } from '@/lib/utils'
import { Search, Star, ChevronDown, Eye, Sparkles, Info } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Provider icons mapping
const providerIcons: Record<string, React.ReactNode> = {
  openai: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  ),
  anthropic: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.368-3.6h6.624l1.368 3.6h3.744L10.152 3.541H6.696zm.456 10.8l2.352-6.192 2.352 6.192H7.152z" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
    </svg>
  ),
  meta: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z" />
    </svg>
  ),
  mistral: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M3.428 0v4.5h4.5V0h-4.5zm6.782 0v4.5h4.5V0h-4.5zm6.79 0v4.5h4.5V0H17zM3.428 6.5v4.5h4.5V6.5h-4.5zm0 6.5v4.5h4.5V13h-4.5zm0 6.5V24h4.5v-4.5h-4.5zM17 6.5v4.5h4.5V6.5H17zm-6.79 0v4.5h4.5V6.5h-4.5zm0 6.5v4.5h4.5V13h-4.5zm6.79 0v4.5h4.5V13H17zm0 6.5V24h4.5v-4.5H17zm-6.79 0V24h4.5v-4.5h-4.5z" />
    </svg>
  ),
  deepseek: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  xai: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M12 0L2 6v12l10 6 10-6V6L12 0zm0 2.5L20 7v10l-8 4.5L4 17V7l8-4.5z" />
    </svg>
  ),
  groq: (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  ),
}

// Default icon for unknown providers
const DefaultProviderIcon = () => (
  <Sparkles className="size-5" />
)

interface ModelSelectorProps {
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  className?: string
}

interface Model {
  _id: string
  modelId: string
  displayName: string
  description?: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
  capabilities?: string[]
  provider: {
    _id: string
    name: string
    providerType: string
    icon?: string
  } | null
  isFavorite: boolean
}

const STORAGE_KEY = 'selected-model-id'

export function ModelSelector({
  selectedModel: externalSelectedModel,
  onModelChange,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [internalSelectedModel, setInternalSelectedModel] = useState<string | undefined>(externalSelectedModel)

  const data = useQuery(api.admin.listModelsWithProviders)
  const toggleFavorite = useMutation(api.admin.toggleFavoriteModel)

  const providers = data?.providers || []
  const allModels = data?.models || []
  const favorites = data?.favorites || []

  // Load saved model from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem(STORAGE_KEY)
      if (savedModel && !externalSelectedModel) {
        setInternalSelectedModel(savedModel)
        onModelChange?.(savedModel)
      }
    }
  }, [])

  // Sync with external selected model
  useEffect(() => {
    if (externalSelectedModel !== undefined) {
      setInternalSelectedModel(externalSelectedModel)
    }
  }, [externalSelectedModel])

  // Get the effective selected model (external takes priority, then internal, then first available)
  const effectiveSelectedModel = externalSelectedModel ?? internalSelectedModel

  // Filter models based on search and selected provider
  const filteredModels = useMemo(() => {
    let models = selectedProvider === 'favorites' 
      ? favorites 
      : selectedProvider 
        ? allModels.filter((m) => m.provider?._id === selectedProvider)
        : allModels

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      models = models.filter(
        (m) =>
          m.displayName.toLowerCase().includes(query) ||
          m.modelId.toLowerCase().includes(query) ||
          m.description?.toLowerCase().includes(query)
      )
    }

    return models
  }, [allModels, favorites, selectedProvider, searchQuery])

  // Get current selected model info
  const currentModel = allModels.find((m) => m.modelId === effectiveSelectedModel)

  const handleSelectModel = (model: Model) => {
    setInternalSelectedModel(model.modelId)
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, model.modelId)
    }
    onModelChange?.(model.modelId)
    setOpen(false)
  }

  const handleToggleFavorite = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await toggleFavorite({ modelId: modelId as any })
  }

  const getProviderIcon = (providerType?: string, icon?: string) => {
    const iconKey = icon || providerType
    if (iconKey && providerIcons[iconKey]) {
      return providerIcons[iconKey]
    }
    return <DefaultProviderIcon />
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
            className
          )}
        >
          {currentModel?.provider && (
            <span className="text-pink-500/60">
              {getProviderIcon(currentModel.provider.providerType, currentModel.provider.icon)}
            </span>
          )}
          <span className="font-medium">{currentModel?.displayName || 'Select model'}</span>
          <ChevronDown className="size-4 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[400px] p-0 overflow-hidden" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        <div className="flex h-[400px]">
          {/* Provider sidebar */}
          <div className="w-14 border-r bg-muted/30 flex flex-col items-center py-2 gap-1">
            {/* Favorites */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSelectedProvider(selectedProvider === 'favorites' ? null : 'favorites')}
                    className={cn(
                      'size-10 rounded-lg flex items-center justify-center transition-colors',
                      selectedProvider === 'favorites'
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Star className={cn('size-5', selectedProvider === 'favorites' && 'fill-current')} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Favorites</TooltipContent>
              </Tooltip>

              {/* Provider icons */}
              {providers.map((provider) => (
                <Tooltip key={provider._id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setSelectedProvider(selectedProvider === provider._id ? null : provider._id)}
                      className={cn(
                        'size-10 rounded-lg flex items-center justify-center transition-colors',
                        selectedProvider === provider._id
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {getProviderIcon(provider.providerType, provider.icon)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{provider.name}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search */}
            <div className="px-4 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-muted/50 border-0 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Models list */}
            <div className="flex-1 overflow-y-auto">
              {filteredModels.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No models found
                </div>
              ) : (
                <div className="p-2">
                  {filteredModels.map((model) => (
                    <div
                      key={model._id}
                      onClick={() => handleSelectModel(model)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer',
                        'hover:bg-muted/60',
                        effectiveSelectedModel === model.modelId && 'bg-muted'
                      )}
                    >
                      {/* Provider icon */}
                      <span className="text-muted-foreground shrink-0">
                        {model.provider && getProviderIcon(model.provider.providerType, model.provider.icon)}
                      </span>

                      {/* Model info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{model.displayName}</span>
                          {model.isFree && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400">
                              Free
                            </span>
                          )}
                          {model.isFavorite && (
                            <Star className="size-3.5 fill-yellow-500 text-yellow-500" />
                          )}
                        </div>
                        {model.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {model.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(model._id, e)}
                          className={cn(
                            'p-1.5 rounded-md transition-colors',
                            model.isFavorite
                              ? 'text-yellow-500 hover:bg-yellow-500/20'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Star className={cn('size-4', model.isFavorite && 'fill-current')} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <Info className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
