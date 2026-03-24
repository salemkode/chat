import { Button } from '@/components/ui/button'
import { Menu, Sparkles, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import { ResponsiveSelectField } from '@/components/ui/responsive-select-field'

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
  const { resolvedTheme, setTheme } = useTheme()

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-background/80 backdrop-blur-sm shrink-0">
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

      <div className="flex items-center gap-2">
        {/* Theme Toggle - Icons only */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={handleThemeToggle}
        >
          <Sun
            className={cn(
              'h-5 w-5 transition-all',
              resolvedTheme === 'dark'
                ? 'scale-0 opacity-0'
                : 'scale-100 opacity-100',
            )}
          />
          <Moon
            className={cn(
              'h-5 w-5 absolute transition-all',
              resolvedTheme === 'dark'
                ? 'scale-100 opacity-100'
                : 'scale-0 opacity-0',
            )}
          />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <ResponsiveSelectField
          value={model}
          onValueChange={onModelChange}
          title="Select model"
          className="w-[160px] bg-secondary border-border text-foreground h-9"
          options={MODELS.map((entry) => ({
            value: entry.id,
            label: `${entry.name}${entry.isFree ? ' (Free)' : ''}`,
          }))}
        />
      </div>
    </header>
  )
}
