import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Menu, Sparkles } from 'lucide-react'

interface ChatHeaderProps {
  title?: string
  model: string
  onModelChange: (model: string) => void
}

const MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', isFree: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'mistralai/devstral-2512:free', name: 'Devstral', isFree: true },
]

export function ChatHeader({
  title = 'New Chat',
  model,
  onModelChange,
}: ChatHeaderProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/80 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-foreground">{title}</h1>
        </div>
      </div>

      <Select value={model} onValueChange={onModelChange}>
        <SelectTrigger className="w-[160px] bg-secondary border-border text-foreground h-9">
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border text-popover-foreground">
          {MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
              {m.isFree && (
                <span className="ml-1 text-xs text-emerald-500">(Free)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  )
}
