'use client'

import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

function subscribeMobileMql(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getMobileMqlSnapshot() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

function getMobileMqlServerSnapshot() {
  return false
}

/**
 * SSR-safe viewport check: use for picking Dialog vs Sheet so only one modal mounts.
 */
export function useViewportIsMobile() {
  return useSyncExternalStore(
    subscribeMobileMql,
    getMobileMqlSnapshot,
    getMobileMqlServerSnapshot,
  )
}

export type AdaptiveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Shown to assistive tech; keep concise. */
  title: string
  description?: string
  children: React.ReactNode
  /** Applied to both desktop dialog and mobile sheet inner surfaces. */
  contentClassName?: string
}

/**
 * One controlled surface: centered {@link Dialog} on desktop, bottom {@link Sheet} on mobile.
 * Use for any flow where the same content should feel like a dialog on large screens and a sheet on phones.
 */
export function AdaptiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  contentClassName,
}: AdaptiveDialogProps) {
  const isMobile = useViewportIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className={cn(
            'flex min-h-0 max-h-[min(520px,85dvh)] flex-col gap-0 overflow-hidden border-x-0 border-t border-border/80 bg-popover p-0 text-popover-foreground shadow-lg',
            'rounded-b-none rounded-t-2xl',
            contentClassName,
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'flex min-h-0 max-h-[min(520px,85dvh)] flex-col gap-0 overflow-hidden border-border/80 bg-popover p-0 text-popover-foreground shadow-lg',
          'w-[min(400px,calc(100vw-2rem))] rounded-2xl sm:max-w-[min(400px,calc(100vw-2rem))]',
          contentClassName,
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="sr-only">
            {description}
          </DialogDescription>
        ) : null}
        {children}
      </DialogContent>
    </Dialog>
  )
}
