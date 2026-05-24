'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type InfiniteScrollTriggerProps = {
  hasMore: boolean
  isLoadingMore?: boolean
  onLoadMore: () => void
  rootRef?: React.RefObject<Element | null>
  rootMargin?: string
  className?: string
  loadingClassName?: string
  loadingLabel?: string
  enabled?: boolean
}

export function InfiniteScrollTrigger({
  hasMore,
  isLoadingMore = false,
  onLoadMore,
  rootRef,
  rootMargin = '240px',
  className,
  loadingClassName,
  loadingLabel = 'Loading...',
  enabled = true,
}: InfiniteScrollTriggerProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const onLoadMoreRef = React.useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  React.useEffect(() => {
    if (!enabled || !hasMore || isLoadingMore) {
      return
    }

    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          onLoadMoreRef.current()
        }
      },
      { root: rootRef?.current ?? null, rootMargin, threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [enabled, hasMore, isLoadingMore, rootMargin, rootRef])

  if (!hasMore && !isLoadingMore) {
    return null
  }

  return (
    <div ref={sentinelRef} className={cn('w-full', className)} aria-hidden={!isLoadingMore}>
      {isLoadingMore ? (
        <p className={cn('py-2 text-center text-xs text-muted-foreground', loadingClassName)}>
          {loadingLabel}
        </p>
      ) : (
        <div className="h-px w-full" />
      )}
    </div>
  )
}
