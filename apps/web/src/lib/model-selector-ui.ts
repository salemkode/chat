import { cn } from '@/lib/utils'

/** Row styling for one AI model entry inside the model selector. */
export function modelSelectorOptionRowClass(isSelected: boolean) {
  return cn(
    'flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
    isSelected
      ? 'border-border/70 bg-muted/90 text-foreground'
      : 'border-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/55 hover:text-foreground',
  )
}

export function modelSelectorIconTileClass() {
  return cn(
    'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background',
  )
}
