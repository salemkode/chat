'use client'

import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { Pin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Thread {
  _id: string
  title?: string
  _creationTime: number
  metadata?: {
    emoji?: string
    sectionId?: string
  }
}

interface ThreadItemProps {
  thread: Thread
  isActive?: boolean
  onPin?: (threadId: string) => void
  onDelete?: (threadId: string) => void
}

export const ThreadItem = memo(function ThreadItem({
  thread,
  isActive,
  onPin,
  onDelete,
}: ThreadItemProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-sidebar="menu-item"
            className="group/menu-item relative px-2 mb-0.5"
          >
            <Link
              to="/$chatId"
              params={{ chatId: thread._id }}
              className={cn(
                'group/link relative flex h-9 w-full items-center overflow-hidden rounded-lg px-2 py-1 text-sm outline-hidden',
                'transition-colors duration-150 ease-snappy',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                'focus-visible:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                'hover:focus-visible:bg-sidebar-accent',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
              data-status={isActive ? 'active' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex w-full items-center">
                <button data-state="closed" className="w-full" tabIndex={-1}>
                  <div className="relative overflow-visible w-full">
                    <div className="relative w-full cursor-pointer transition-[filter] duration-500 ease-snappy">
                      <input
                        aria-label="Thread title"
                        aria-describedby="thread-title-hint"
                        aria-readonly="true"
                        readOnly
                        tabIndex={-1}
                        className={cn(
                          'h-full w-full rounded bg-transparent px-1 py-1 text-left text-sm outline-hidden',
                          '[unicode-bidi:plaintext] hover:truncate-none',
                          'pointer-events-none cursor-pointer truncate overflow-hidden',
                          isActive
                            ? 'text-sidebar-accent-foreground'
                            : 'text-muted-foreground',
                        )}
                        dir="auto"
                        title={thread.title || 'Untitled Chat'}
                        type="text"
                        value={`${thread.title || 'Untitled Chat'}`}
                      />
                    </div>
                  </div>
                </button>

                {/* Action buttons - appear on hover */}
                <div
                  className={cn(
                    'mobile:hidden pointer-events-auto absolute top-0 -right-1 bottom-0 z-50 flex items-center justify-end text-muted-foreground',
                    'transition-transform duration-200 ease-snappy',
                    'translate-x-full bg-sidebar-accent',
                    'group-hover/menu-item:translate-x-0 group-focus-within/menu-item:translate-x-0',
                  )}
                >
                  {/* Gradient fade effect */}
                  <div
                    className={cn(
                      'pointer-events-none absolute top-0 right-full bottom-0 h-12 w-8 bg-linear-to-l from-sidebar-accent to-transparent',
                      'transition-opacity duration-200',
                      'opacity-0 group-hover/menu-item:opacity-100 group-focus-within/menu-item:opacity-100',
                    )}
                  />

                  {/* Pin button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="rounded-md p-1.5 hover:bg-muted/40 transition-colors"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onPin?.(thread._id)
                        }}
                        aria-label="Pin Thread"
                      >
                        <Pin className="size-4" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Pin Thread</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Delete button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="rounded-md p-1.5 hover:bg-destructive/50 hover:text-destructive-foreground transition-colors"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onDelete?.(thread._id)
                        }}
                        aria-label="Delete thread"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Delete thread</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </Link>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          <p>{thread.title || 'Untitled Chat'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}, areThreadItemPropsEqual)

function areThreadItemPropsEqual(
  prev: ThreadItemProps,
  next: ThreadItemProps,
): boolean {
  if (prev.isActive !== next.isActive) return false
  if (prev.onPin !== next.onPin) return false
  if (prev.onDelete !== next.onDelete) return false
  const a = prev.thread
  const b = next.thread
  if (a === b) return true
  return (
    a._id === b._id &&
    a.title === b.title &&
    a._creationTime === b._creationTime &&
    a.metadata?.emoji === b.metadata?.emoji &&
    a.metadata?.sectionId === b.metadata?.sectionId
  )
}
