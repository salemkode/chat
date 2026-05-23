import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { XIcon } from '@/lib/icons'

import { cn } from '@/lib/utils'

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[color:var(--overlay-scrim)] backdrop-blur-[8px] duration-300',
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  const showHandle = side === 'top' || side === 'bottom'

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'overlay-sheet-surface data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-0 overflow-hidden outline-none transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:duration-200',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-2 right-2 h-[calc(100dvh-1rem)] w-[min(24rem,calc(100vw-1rem))] rounded-[calc(var(--overlay-radius-mobile)+0.1rem)]',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-2 left-2 h-[calc(100dvh-1rem)] w-[min(24rem,calc(100vw-1rem))] rounded-[calc(var(--overlay-radius-mobile)+0.1rem)]',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-2 top-2 h-auto max-h-[calc(100dvh-1rem)] rounded-[calc(var(--overlay-radius-mobile)+0.1rem)]',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-2 bottom-2 h-auto max-h-[calc(100dvh-1rem)] rounded-[calc(var(--overlay-radius-mobile)+0.1rem)] pb-[calc(env(safe-area-inset-bottom)+0.25rem)]',
          className,
        )}
        {...props}
      >
        {showHandle ? <div className="overlay-sheet-handle mx-auto mt-3 shrink-0" /> : null}
        {children}
        <SheetPrimitive.Close
          className="overlay-sheet-close ring-offset-background focus:ring-ring absolute top-4 right-4 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:scale-[1.02] hover:text-foreground focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 px-5 py-4 md:px-6 md:py-5', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 px-5 py-4 md:px-6 md:py-5', className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-foreground font-semibold', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
