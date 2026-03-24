import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { ChevronDown, Circle } from 'lucide-react'
import React from 'react'

export type ChainOfThoughtItemProps = React.ComponentProps<'div'>

export function ChainOfThoughtItem({
  children,
  className,
  ...props
}: ChainOfThoughtItemProps) {
  return (
    <div className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </div>
  )
}

export type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  leftIcon?: React.ReactNode
  swapIconOnHover?: boolean
}

export function ChainOfThoughtTrigger({
  children,
  className,
  leftIcon,
  swapIconOnHover = true,
  ...props
}: ChainOfThoughtTriggerProps) {
  const shouldHideIcon = leftIcon === null

  return (
    <CollapsibleTrigger
      className={cn(
        'group flex cursor-pointer items-center justify-start gap-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        {shouldHideIcon ? null : leftIcon ? (
          <span className="relative inline-flex size-4 items-center justify-center">
            <span
              className={cn(
                'transition-opacity',
                swapIconOnHover && 'group-hover:opacity-0',
              )}
            >
              {leftIcon}
            </span>
            {swapIconOnHover ? (
              <ChevronDown className="absolute size-4 opacity-0 transition-opacity group-data-[state=open]:rotate-180 group-hover:opacity-100" />
            ) : null}
          </span>
        ) : (
          <span className="relative inline-flex size-4 items-center justify-center">
            <Circle className="size-2 fill-current" />
          </span>
        )}
        <span>{children}</span>
      </div>
      {!leftIcon && !shouldHideIcon ? (
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      ) : shouldHideIcon ? (
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      ) : null}
    </CollapsibleTrigger>
  )
}

export type ChainOfThoughtContentProps = React.ComponentProps<
  typeof CollapsibleContent
>

export function ChainOfThoughtContent({
  children,
  className,
  ...props
}: ChainOfThoughtContentProps) {
  return (
    <CollapsibleContent
      className={cn(
        'overflow-hidden text-popover-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className,
      )}
      {...props}
    >
      <div className="grid grid-cols-[min-content_minmax(0,1fr)] gap-x-4">
        <div className="ml-1.75 h-full w-px bg-primary/20 group-data-[last=true]:hidden" />
        <div className="ml-1.75 h-full w-px bg-transparent group-data-[last=false]:hidden" />
        <div className="mt-2 space-y-2">{children}</div>
      </div>
    </CollapsibleContent>
  )
}

export function ChainOfThought({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const childrenArray = React.Children.toArray(children)

  return (
    <div className={cn('space-y-0', className)}>
      {childrenArray.map((child, index) => (
        <React.Fragment key={index}>
          {React.isValidElement(child)
            ? React.cloneElement(
                child as React.ReactElement<ChainOfThoughtStepProps>,
                {
                  isLast: index === childrenArray.length - 1,
                },
              )
            : child}
        </React.Fragment>
      ))}
    </div>
  )
}

export type ChainOfThoughtStepProps = {
  children: React.ReactNode
  className?: string
  isLast?: boolean
} & React.ComponentProps<typeof Collapsible>

export function ChainOfThoughtStep({
  children,
  className,
  isLast = false,
  ...props
}: ChainOfThoughtStepProps) {
  return (
    <Collapsible
      className={cn('group', className)}
      data-last={isLast}
      {...props}
    >
      {children}
      <div className="flex justify-start group-data-[last=true]:hidden">
        <div className="ml-1.75 h-4 w-px bg-primary/20" />
      </div>
    </Collapsible>
  )
}
