'use client'

import { Check, ChevronDown } from '@/lib/icons'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTrigger,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { useResponsiveOverlayMode } from '@/hooks/use-responsive-overlay-mode'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ResponsiveSelectOption = {
  value: string
  label: string
}

export function ResponsiveSelectField({
  value,
  placeholder = 'Select option',
  options,
  onValueChange,
  className,
  title = 'Choose option',
  disabled,
}: {
  value?: string
  placeholder?: string
  options: ResponsiveSelectOption[]
  onValueChange: (value: string) => void
  className?: string
  title?: string
  disabled?: boolean
}) {
  const { isMobile } = useResponsiveOverlayMode()
  const [open, setOpen] = useState(false)

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const currentLabel =
    options.find((option) => option.value === value)?.label ?? placeholder

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'border-input data-[placeholder]:text-muted-foreground flex h-9 w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn(!value && 'text-muted-foreground')}>{currentLabel}</span>
          <ChevronDown className="size-4 opacity-50" />
        </button>
      </ResponsiveModalTrigger>
      <ResponsiveModalContent size="small" className="p-0">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="max-h-[70dvh] overflow-y-auto p-2">
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onValueChange(option.value)
                  setOpen(false)
                }}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="size-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
