'use client'

import { AppSidebar as NewAppSidebar } from './sidebar'

interface AppSidebarProps {
  selectedThreadId?: string | null
  className?: string
}

export function AppSidebar({ selectedThreadId, className }: AppSidebarProps) {
  return (
    <NewAppSidebar 
      selectedThreadId={selectedThreadId}
      className={className}
    />
  )
}
