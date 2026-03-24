'use client'

import { ThreadItem } from './thread-item'
import { cn } from '@/lib/utils'

interface Thread {
  _id: string
  title?: string
  _creationTime: number
  metadata?: {
    emoji?: string
    sectionId?: string
  }
}

interface ThreadGroupProps {
  label: string
  threads: Thread[]
  selectedThreadId?: string | null
  onPinThread?: (threadId: string) => void
  onDeleteThread?: (threadId: string) => void
  className?: string
}

export function ThreadGroup({
  label,
  threads,
  selectedThreadId,
  onPinThread,
  onDeleteThread,
  className,
}: ThreadGroupProps) {
  if (threads.length === 0) return null

  return (
    <div className={cn('relative mt-2 w-full', className)}>
      {/* Group Label */}
      <div
        data-sidebar="group-label"
        className={cn(
          'flex h-8 shrink-0 items-center rounded-md text-xs font-medium',
          'ring-sidebar-ring outline-hidden',
          'transition-[margin,opacity] duration-200 ease-snappy',
          'select-none focus-visible:ring-2',
          '[&>svg]:size-4 [&>svg]:shrink-0',
          'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
          'px-3.5 py-2 pt-4 text-color-heading',
        )}
      >
        <span>{label}</span>
      </div>

      {/* Thread Items */}
      <div className="space-y-0.5">
        {threads.map((thread, index) => (
          <div
            key={thread._id}
            className="absolute top-0 left-0 w-full transition-transform"
            style={{
              height: 36,
              transform: `translateY(${32 + index * 36}px)`,
            }}
          >
            <ThreadItem
              thread={thread}
              isActive={selectedThreadId === thread._id}
              onPin={onPinThread}
              onDelete={onDeleteThread}
            />
          </div>
        ))}
      </div>

      {/* Spacer for absolute positioning */}
      <div style={{ height: 32 + threads.length * 36 }} />
    </div>
  )
}
