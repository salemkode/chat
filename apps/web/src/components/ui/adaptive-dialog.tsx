'use client'

import { cn } from '@/lib/utils'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'

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
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        showCloseButton
        size="medium"
        className={cn(
          'flex min-h-0 max-h-[min(520px,var(--overlay-sheet-max-height))] flex-col gap-0 overflow-hidden',
          'w-[min(400px,calc(100vw-2rem))] sm:max-w-[min(400px,calc(100vw-2rem))]',
          contentClassName,
        )}
      >
        <ResponsiveModalTitle className="sr-only">{title}</ResponsiveModalTitle>
        {description ? (
          <ResponsiveModalDescription className="sr-only">
            {description}
          </ResponsiveModalDescription>
        ) : null}
        {children}
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
