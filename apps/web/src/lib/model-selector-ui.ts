import { cn } from '@/lib/utils'

export function modelSectionLabelClass() {
  return 'px-1 pb-2 text-xs font-medium text-muted-foreground'
}

export function modelFilterPillClass(active: boolean) {
  return cn(
    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  )
}

export function modelRowClass(selected: boolean) {
  return cn(
    'flex items-stretch gap-2 rounded-4xl border px-2 py-2 transition-colors',
    selected ? 'border-border bg-muted' : 'border-transparent hover:bg-muted/50',
  )
}

export function modelIconTileClass(selected?: boolean) {
  return cn(
    'flex size-9 shrink-0 items-center justify-center rounded-full border bg-background',
    selected ? 'border-primary/40' : 'border-border',
  )
}
