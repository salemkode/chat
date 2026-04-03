'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import {
  DialogHeader,
} from '@/components/ui/dialog'
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { appIconNames, getIcon } from '@/lib/icons'

const POPULAR_ICONS = [...appIconNames]

interface IconPickerDialogProps {
  threadId: string
  currentIcon?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IconPickerDialog({
  threadId,
  currentIcon,
  open,
  onOpenChange,
}: IconPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const updateIcon = useMutation(api.agents.updateThreadIcon)

  const filteredIcons = search
    ? POPULAR_ICONS.filter((icon) =>
        icon.toLowerCase().includes(search.toLowerCase()),
      )
    : POPULAR_ICONS

  const handleSelectIcon = async (iconName: string) => {
    setIsLoading(true)
    try {
      await updateIcon({ threadId, icon: iconName })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update icon:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderIcon = (iconName: string) => {
    const IconComponent = getIcon(iconName)
    if (IconComponent) {
      return <IconComponent className="w-6 h-6" />
    }
    return null
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent
        size="small"
        className="max-h-[80vh] overflow-hidden flex flex-col"
      >
        <DialogHeader>
          <ResponsiveModalTitle>Choose Icon</ResponsiveModalTitle>
        </DialogHeader>

        <div className="py-4">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          <div className="grid grid-cols-8 gap-2 overflow-y-auto max-h-[400px] p-2">
            {filteredIcons.map((iconName) => (
              <button
                key={iconName}
                onClick={() => handleSelectIcon(iconName)}
                disabled={isLoading}
                className={`
                  p-3 rounded-lg flex items-center justify-center
                  transition-colors hover:bg-accent
                  ${currentIcon === iconName ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}
                `}
                title={iconName}
              >
                {renderIcon(iconName)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
