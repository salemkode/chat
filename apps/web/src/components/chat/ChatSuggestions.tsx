import type { ChatSuggestion } from '@chat/shared'

export function ChatSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: ChatSuggestion[]
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSelect(suggestion.prompt)}
          className="rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/35 hover:bg-accent"
        >
          {suggestion.title}
        </button>
      ))}
    </div>
  )
}
