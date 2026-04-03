'use client'

import * as React from 'react'
import { Pin, X } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type BaseAnimatedThread = {
  id: string
  title?: string
  emoji: string
  pinned: boolean
}

function IconActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
    >
      {icon}
    </Button>
  )
}

export function ThreadRow({
  thread,
  isActive,
  onOpen,
  onTogglePinned,
  onRemoveFromProject,
}: {
  thread: BaseAnimatedThread
  isActive?: boolean
  onOpen: () => void
  onTogglePinned: () => void
  onRemoveFromProject?: () => void
}) {
  return (
    <SidebarMenuItem className="group/thread">
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          'w-full justify-between pr-1',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
        )}
      >
        <div>
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto min-w-0 flex-1 justify-start gap-2 text-left"
            onClick={onOpen}
          >
            <span className="shrink-0">{thread.emoji}</span>
            <span className="truncate text-sm">
              {thread.title || 'Untitled chat'}
            </span>
          </Button>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/thread:opacity-100">
            <IconActionButton
              label={thread.pinned ? 'Unpin chat' : 'Pin chat'}
              onClick={onTogglePinned}
              icon={
                <Pin className={cn('size-3.5', thread.pinned && 'fill-current')} />
              }
            />
            {onRemoveFromProject ? (
              <IconActionButton
                label="Remove from project"
                onClick={onRemoveFromProject}
                icon={<X className="size-3.5" />}
              />
            ) : null}
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AnimatedThreadList<TThread extends BaseAnimatedThread>({
  threads,
  renderThread,
  className,
}: {
  threads: TThread[]
  renderThread: (thread: TThread) => React.ReactNode
  className?: string
}) {
  const rowRefs = React.useRef(new Map<string, HTMLDivElement>())
  const previousRects = React.useRef(new Map<string, DOMRect>())
  const threadIds = React.useMemo(
    () => threads.map((thread) => thread.id),
    [threads],
  )

  React.useLayoutEffect(() => {
    const currentRects = new Map<string, DOMRect>()
    const activeIds = new Set(threadIds)

    for (const threadId of threadIds) {
      const node = rowRefs.current.get(threadId)
      if (!node) continue
      currentRects.set(threadId, node.getBoundingClientRect())
    }

    for (const [threadId, node] of rowRefs.current.entries()) {
      if (!activeIds.has(threadId)) {
        rowRefs.current.delete(threadId)
        continue
      }

      const currentRect = currentRects.get(threadId)
      if (!currentRect) continue

      const previousRect = previousRects.current.get(threadId)
      if (!previousRect) {
        node.animate(
          [
            { opacity: 0, transform: 'translateY(-8px) scale(0.985)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' },
          ],
          {
            duration: 180,
            easing: 'cubic-bezier(.16,1,.3,1)',
          },
        )
        continue
      }

      const deltaY = previousRect.top - currentRect.top
      if (Math.abs(deltaY) < 1) continue

      node.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: 'translateY(0px)' },
        ],
        {
          duration: 220,
          easing: 'cubic-bezier(.2,0,0,1)',
        },
      )
    }

    previousRects.current = currentRects
  }, [threadIds])

  return (
    <div className={cn('space-y-1', className)}>
      {threads.map((thread) => (
        <div
          key={thread.id}
          ref={(node) => {
            if (node) {
              rowRefs.current.set(thread.id, node)
              return
            }
            rowRefs.current.delete(thread.id)
          }}
          className="will-change-transform"
        >
          {renderThread(thread)}
        </div>
      ))}
    </div>
  )
}
