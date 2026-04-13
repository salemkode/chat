'use client'

import { memo } from 'react'
import { AppSidebar as NewAppSidebar } from './sidebar'

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

export const AppSidebar = memo(function AppSidebar({
  selectedThreadId,
  className,
}: AppSidebarProps) {
  return <NewAppSidebar selectedThreadId={selectedThreadId} className={className} />
})
