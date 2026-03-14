import { ChevronDown, Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { api } from 'convex/_generated/api'
import { useQuery } from '@/lib/convex-query-cache'

type AgentMode = 'auto' | 'agent' | 'plan'

interface Model {
  _id: string
  modelId: string
  displayName: string
  isEnabled: boolean
  isFree: boolean
  sortOrder: number
}

interface AgentModeSelectorProps {
  agentMode: AgentMode
  onAgentModeChange: (mode: AgentMode) => void
  selectedModel?: string
  onModelChange?: (modelId: string) => void
}

const agentModeLabel = {
  auto: 'Auto',
  agent: 'Agent Mode',
  plan: 'Plan Mode',
}

export function AgentModeSelector({
  agentMode,
  onAgentModeChange,
  selectedModel,
  onModelChange,
}: AgentModeSelectorProps) {
  const availableModels = useQuery(api.admin.listEnabledModels)

  const showModelSelector = !!onModelChange

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 rounded-full px-3 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {showModelSelector && selectedModel ? (
            <>
              <Zap className="h-3 w-3" />
              {availableModels?.find((m: Model) => m.modelId === selectedModel)
                ?.displayName || 'Model'}
            </>
          ) : (
            agentModeLabel[agentMode]
          )}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 rounded-xl border-border bg-background p-2"
        align="start"
        sideOffset={8}
      >
        {/* Agent Mode Section */}
        <div className="mb-3">
          <p className="mb-2 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Agent Mode
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onAgentModeChange('auto')}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Auto
              {agentMode === 'auto' && (
                <Check className="h-4 w-4 text-indigo-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onAgentModeChange('agent')}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <span className="flex items-center gap-2">
                Agent Mode
                <Badge className="bg-indigo-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-indigo-600">
                  Beta
                </Badge>
              </span>
              {agentMode === 'agent' && (
                <Check className="h-4 w-4 text-indigo-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onAgentModeChange('plan')}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Plan Mode
              {agentMode === 'plan' && (
                <Check className="h-4 w-4 text-indigo-400" />
              )}
            </button>
          </div>
        </div>

        {/* Model Selection Section */}
        {showModelSelector && availableModels && availableModels.length > 0 && (
          <>
            <div className="border-t border-zinc-800 my-3" />
            <div>
              <p className="mb-2 px-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Model
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableModels
                  .sort((a: Model, b: Model) => a.sortOrder - b.sortOrder)
                  .map((model: Model) => (
                    <button
                      key={model._id}
                      type="button"
                      onClick={() => onModelChange!(model.modelId)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span>{model.displayName}</span>
                        {model.isFree && (
                          <Badge className="bg-green-600 px-1.5 py-0 text-[10px] font-medium text-white hover:bg-green-600">
                            Free
                          </Badge>
                        )}
                      </div>
                      {selectedModel === model.modelId && (
                        <Check className="h-4 w-4 text-indigo-400" />
                      )}
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
