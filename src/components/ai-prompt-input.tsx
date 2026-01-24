import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  AtSign,
  Paperclip,
  Globe,
  ArrowUp,
  ChevronDown,
  Check,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Model = {
  _id: string
  modelId: string
  displayName: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
  provider?: {
    name: string
    providerType: string
  }
}

const pages = [
  { icon: '📋', label: 'Meeting Notes' },
  { icon: '📊', label: 'Project Dashboard' },
  { icon: '💡', label: 'Ideas & Brainstorming' },
  { icon: '📅', label: 'Calendar & Events' },
  { icon: '📑', label: 'Documentation' },
  { icon: '🎯', label: 'Goals & Objectives' },
  { icon: '💰', label: 'Budget Planning' },
  { icon: '👥', label: 'Team Directory' },
  { icon: '🔧', label: 'Technical Specs' },
]

interface AIPromptInputProps {
  onSubmit?: (value: string, model?: string) => void
  disabled?: boolean
}

export function AIPromptInput({
  onSubmit,
  disabled = false,
}: AIPromptInputProps) {
  const [value, setValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [modelSearchQuery, setModelSearchQuery] = useState('')

  // Fetch enabled models from Convex
  const models = useQuery(api.admin.listEnabledModels) ?? []

  const filteredPages = pages.filter((page) =>
    page.label.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Filter models based on search query
  const filteredModels = models.filter((model) =>
    model.displayName.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
    model.modelId.toLowerCase().includes(modelSearchQuery.toLowerCase()),
  )

  // Set default model (first free model or first model)
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      const freeModel = models.find((m) => m.isFree)
      setSelectedModel((freeModel || models[0]).modelId)
    }
  }, [models, selectedModel])

  const handleSubmit = () => {
    if (value.trim() && onSubmit) {
      onSubmit(value, selectedModel)
      setValue('')
    }
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        <div className="rounded-2xl border border-input bg-card p-4 shadow-lg">
          <div className="mb-3">
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <AtSign className="h-4 w-4" />
                      Add context
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Mention a person, page, or date
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-64 rounded-xl p-0"
                align="start"
                sideOffset={8}
              >
                {/* Search input */}
                <div className="flex items-center gap-2 border-b border-input px-3 py-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pages..."
                    className="h-8 border-0 bg-transparent p-0 px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                </div>
                {/* Pages list */}
                <div className="p-2">
                  <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Pages
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPages.map((page) => (
                      <button
                        type="button"
                        key={page.label}
                        onClick={() => {
                          setSelectedPage(page.label)
                          setSearchQuery('')
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent',
                          selectedPage === page.label && 'bg-accent',
                        )}
                      >
                        <span className="text-base">{page.icon}</span>
                        {page.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Textarea */}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Ask, search, or make anything..."
            className="min-h-[60px] w-full resize-none bg-transparent text-lg text-muted-foreground placeholder:text-muted-foreground focus:outline-none"
            rows={2}
          />

          {/* Bottom toolbar */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Attachment button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-full px-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-1 rounded-full px-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {models.find((m) => m.modelId === selectedModel)?.displayName || 'Select Model'}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 rounded-xl border-input bg-card p-2"
                  align="start"
                  sideOffset={8}
                >
                  {/* Search input */}
                  <div className="flex items-center gap-2 border-b border-input px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      placeholder="Search models..."
                      className="h-8 border-0 bg-transparent p-0 px-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                    />
                  </div>
                  {/* Models list */}
                  <div className="max-h-64 overflow-y-auto p-2">
                    {filteredModels.length === 0 ? (
                      <p className="px-2 py-4 text-sm text-muted-foreground text-center">
                        {modelSearchQuery ? 'No models found' : 'No enabled models'}
                      </p>
                    ) : (
                      filteredModels.map((model) => (
                        <button
                          type="button"
                          key={model._id}
                          onClick={() => {
                            setSelectedModel(model.modelId)
                            setModelSearchQuery('')
                          }}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-foreground transition-colors hover:bg-accent',
                            selectedModel === model.modelId && 'bg-accent',
                          )}
                        >
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium">{model.displayName}</span>
                            {model.provider && (
                              <span className="text-xs text-muted-foreground">{model.provider.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {model.isFree && (
                              <Badge className="bg-green-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-green-600">
                                Free
                              </Badge>
                            )}
                            {selectedModel === model.modelId && <Check className="h-4 w-4" />}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* All Sources dropdown */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-full px-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Globe className="h-4 w-4" />
                All Sources
              </Button>
            </div>

            {/* Submit button */}
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={disabled || !value.trim()}
              onClick={handleSubmit}
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
