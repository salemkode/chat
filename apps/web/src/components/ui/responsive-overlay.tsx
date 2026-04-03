'use client'

import * as React from 'react'
import { XIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useResponsiveOverlayMode } from '@/hooks/use-responsive-overlay-mode'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type ResponsiveModalContextValue = {
  isMobile: boolean
}

const ResponsiveModalContext = React.createContext<
  ResponsiveModalContextValue | undefined
>(undefined)

function useResponsiveModalContext() {
  const context = React.useContext(ResponsiveModalContext)
  if (!context) {
    throw new Error('ResponsiveModal components must be used within ResponsiveModal')
  }
  return context
}

type ResponsivePopupContextValue = {
  isMobile: boolean
  setOpen: (open: boolean) => void
}

const ResponsivePopupContext = React.createContext<
  ResponsivePopupContextValue | undefined
>(undefined)

function useResponsivePopupContext() {
  const context = React.useContext(ResponsivePopupContext)
  if (!context) {
    throw new Error('ResponsivePopup components must be used within ResponsivePopup')
  }
  return context
}

export type ResponsiveModalSize = 'small' | 'page' | 'wide'

const modalSizeClasses: Record<ResponsiveModalSize, string> = {
  small: 'md:w-[32rem]',
  page: 'md:w-[45rem]',
  /** Two-column shells (e.g. settings): ~900px on desktop, capped to viewport. */
  wide: 'md:w-[min(56.25rem,calc(100vw-2rem))]',
}

function ResponsiveModal({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const { isMobile } = useResponsiveOverlayMode()

  return (
    <ResponsiveModalContext.Provider value={{ isMobile }}>
      {isMobile ? <Drawer {...props}>{children}</Drawer> : <Dialog {...props}>{children}</Dialog>}
    </ResponsiveModalContext.Provider>
  )
}

function ResponsiveModalTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isMobile } = useResponsiveModalContext()
  return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />
}

function ResponsiveModalClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const { isMobile } = useResponsiveModalContext()
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />
}

function ResponsiveModalContent({
  className,
  children,
  showCloseButton = true,
  size = 'small',
  ...props
}: Omit<React.ComponentProps<typeof DialogContent>, 'showCloseButton'> & {
  showCloseButton?: boolean
  size?: ResponsiveModalSize
}) {
  const { isMobile } = useResponsiveModalContext()

  if (isMobile) {
    return (
      <DrawerContent
        className={cn(
          'max-h-[92dvh] w-full border-x-0 border-t-[--overlay-border-strong] bg-popover text-popover-foreground',
          'rounded-t-3xl pb-0',
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-3 h-1.5 w-12 rounded-full" />
        {showCloseButton ? (
          <DrawerClose className="ring-offset-background focus:ring-ring absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:text-foreground focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DrawerClose>
        ) : null}
        {children}
      </DrawerContent>
    )
  }

  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        'w-full max-w-[calc(100%-2rem)] rounded-[var(--overlay-radius-desktop)] border-[--overlay-border-strong] bg-popover text-popover-foreground',
        modalSizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border/80 px-5 py-4 md:px-6',
        className,
      )}
      {...props}
    />
  )
}

function ResponsiveModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6', className)} {...props} />
}

function ResponsiveModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-auto border-t border-border/80 px-5 py-4 md:px-6',
        className,
      )}
      {...props}
    />
  )
}

function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isMobile } = useResponsiveModalContext()
  return isMobile ? (
    <DrawerTitle className={cn('text-base font-semibold', className)} {...props} />
  ) : (
    <DialogTitle className={cn('text-base font-semibold', className)} {...props} />
  )
}

function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isMobile } = useResponsiveModalContext()
  return isMobile ? (
    <DrawerDescription className={cn('text-sm text-muted-foreground', className)} {...props} />
  ) : (
    <DialogDescription
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function useControllableOpenState({
  open,
  defaultOpen,
  onOpenChange,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false)
  const isControlled = open !== undefined
  const actualOpen = isControlled ? open : uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange],
  )

  return [actualOpen, setOpen] as const
}

function ResponsivePopup({
  children,
  open,
  defaultOpen,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { isMobile } = useResponsiveOverlayMode()
  const [actualOpen, setOpen] = useControllableOpenState({
    open,
    defaultOpen,
    onOpenChange,
  })

  return (
    <ResponsivePopupContext.Provider value={{ isMobile, setOpen }}>
      {isMobile ? (
        <Drawer open={actualOpen} onOpenChange={setOpen}>
          {children}
        </Drawer>
      ) : (
        <Popover open={actualOpen} onOpenChange={setOpen}>
          {children}
        </Popover>
      )}
    </ResponsivePopupContext.Provider>
  )
}

function ResponsivePopupTrigger({
  ...props
}: React.ComponentProps<typeof PopoverTrigger>) {
  const { isMobile } = useResponsivePopupContext()
  return isMobile ? <DrawerTrigger {...props} /> : <PopoverTrigger {...props} />
}

function ResponsivePopupContent({
  className,
  children,
  size = 'small',
  align = 'start',
  side = 'bottom',
  sideOffset = 8,
  ...props
}: Omit<React.ComponentProps<typeof PopoverContent>, 'align' | 'side'> & {
  size?: ResponsiveModalSize
  align?: React.ComponentProps<typeof PopoverContent>['align']
  side?: React.ComponentProps<typeof PopoverContent>['side']
}) {
  const { isMobile } = useResponsivePopupContext()

  if (isMobile) {
    return (
      <DrawerContent
        className={cn(
          'max-h-[92dvh] w-full border-x-0 border-t-[--overlay-border-strong] bg-popover text-popover-foreground rounded-t-3xl',
          className,
        )}
      >
        <div className="bg-muted mx-auto mt-3 h-1.5 w-12 rounded-full" />
        <DrawerClose className="ring-offset-background focus:ring-ring absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:text-foreground focus:ring-2 focus:ring-offset-2 focus:outline-hidden">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DrawerClose>
        {children}
      </DrawerContent>
    )
  }

  const widthClass = size === 'page' ? 'w-[28rem]' : 'w-[20rem]'

  return (
    <PopoverContent
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn(
        'rounded-2xl border-[--overlay-border-strong] bg-popover text-popover-foreground p-0',
        widthClass,
        className,
      )}
      {...props}
    >
      {children}
    </PopoverContent>
  )
}

function ResponsivePopupHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3',
        className,
      )}
      {...props}
    />
  )
}

function ResponsivePopupTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold', className)} {...props} />
}

function ResponsivePopupDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-muted-foreground', className)} {...props} />
}

function ResponsivePopupClose({
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useResponsivePopupContext()
  return (
    <button
      type="button"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      }}
      {...props}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </button>
  )
}

export {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
  ResponsivePopup,
  ResponsivePopupClose,
  ResponsivePopupContent,
  ResponsivePopupDescription,
  ResponsivePopupHeader,
  ResponsivePopupTitle,
  ResponsivePopupTrigger,
}
