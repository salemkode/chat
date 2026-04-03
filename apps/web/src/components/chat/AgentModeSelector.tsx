import { ChevronDown, Check, Zap } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ResponsivePopup,
  ResponsivePopupContent,
  ResponsivePopupTrigger,
} from '@/components/ui/responsive-overlay'
import { api } from '@convex/_generated/api'
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

function modeRowClass(active: boolean) {
  return cn(
    'flex h-auto w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors',
    active
      ? 'border-border bg-muted font-medium'
      : 'border-transparent hover:bg-muted/60',
  )
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
    <ResponsivePopup>
      <ResponsivePopupTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1 font-normal">
          {showModelSelector && selectedModel ? (
            <>
              <Zap className="h-3 w-3" />
              {availableModels?.find((m: Model) => m.modelId === selectedModel)
                ?.displayName || 'Model'}
            </>
          ) : (
            agentModeLabel[agentMode]
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </ResponsivePopupTrigger>
      <ResponsivePopupContent
        size="small"
        className="w-72 p-0"
        align="start"
        sideOffset={8}
      >
        <div className="max-h-[min(400px,70dvh)] overflow-y-auto p-2">
          <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Agent mode</p>
          <div className="space-y-0.5">
            <Button
              type="button"
              variant="plain"
              size="none"
              onClick={() => onAgentModeChange('auto')}
              className={modeRowClass(agentMode === 'auto')}
            >
              Auto
              {agentMode === 'auto' ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
            </Button>
            <Button
              type="button"
              variant="plain"
              size="none"
              onClick={() => onAgentModeChange('agent')}
              className={modeRowClass(agentMode === 'agent')}
            >
              <span className="flex items-center gap-2">
                Agent
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Beta
                </Badge>
              </span>
              {agentMode === 'agent' ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
            </Button>
            <Button
              type="button"
              variant="plain"
              size="none"
              onClick={() => onAgentModeChange('plan')}
              className={modeRowClass(agentMode === 'plan')}
            >
              Plan
              {agentMode === 'plan' ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
            </Button>
          </div>

          {showModelSelector && availableModels && availableModels.length > 0 ? (
            <>
              <div className="my-2 border-t border-border" />
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">Model</p>
              <div className="max-h-40 space-y-0.5 overflow-y-auto">
                {availableModels
                  .sort((a: Model, b: Model) => a.sortOrder - b.sortOrder)
                  .map((model: Model) => {
                    const isPick = selectedModel === model.modelId
                    return (
                      <Button
                        key={model._id}
                        type="button"
                        variant="plain"
                        size="none"
                        onClick={() => onModelChange!(model.modelId)}
                        className={modeRowClass(isPick)}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{model.displayName}</span>
                          {model.isFree ? (
                            <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                              Free
                            </Badge>
                          ) : null}
                        </span>
                        {isPick ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </Button>
                    )
                  })}
              </div>
            </>
          ) : null}
        </div>
      </ResponsivePopupContent>
    </ResponsivePopup>
  )
}
