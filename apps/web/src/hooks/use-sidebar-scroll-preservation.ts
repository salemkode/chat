'use client'

import * as React from 'react'

type ScrollAnchor = {
  id: string
  offsetTop: number
}

export function useSidebarScrollPreservation() {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const pendingAnchorRef = React.useRef<ScrollAnchor | null>(null)
  const previousListLengthsRef = React.useRef<{ threads: number; projects: number } | null>(
    null,
  )

  const captureAnchor = React.useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const containerTop = container.getBoundingClientRect().top
    const elements = container.querySelectorAll('[data-sidebar-scroll-anchor]')

    for (const element of elements) {
      const rect = element.getBoundingClientRect()
      if (rect.bottom <= containerTop + 1) {
        continue
      }

      const id = element.getAttribute('data-sidebar-scroll-anchor')
      if (!id) {
        continue
      }

      pendingAnchorRef.current = {
        id,
        offsetTop: rect.top - containerTop,
      }
      return
    }

    pendingAnchorRef.current = null
  }, [])

  const runPreservingScroll = React.useCallback(
    (action: () => void) => {
      captureAnchor()
      action()
    },
    [captureAnchor],
  )

  const restoreAnchor = React.useCallback(() => {
    const pending = pendingAnchorRef.current
    const container = containerRef.current
    if (!pending || !container) {
      return
    }

    const element = container.querySelector(
      `[data-sidebar-scroll-anchor="${pending.id}"]`,
    )
    if (!element) {
      pendingAnchorRef.current = null
      return
    }

    const containerTop = container.getBoundingClientRect().top
    const nextOffsetTop = element.getBoundingClientRect().top - containerTop
    const delta = nextOffsetTop - pending.offsetTop

    if (Math.abs(delta) >= 1) {
      container.scrollTop += delta
    }

    pendingAnchorRef.current = null
  }, [])

  const syncScrollAfterListChange = React.useCallback(
    (threadsLength: number, projectsLength: number) => {
      const previous = previousListLengthsRef.current
      previousListLengthsRef.current = { threads: threadsLength, projects: projectsLength }

      if (!pendingAnchorRef.current || !previous) {
        return
      }

      if (previous.threads === threadsLength && previous.projects === projectsLength) {
        return
      }

      restoreAnchor()
    },
    [restoreAnchor],
  )

  return { containerRef, runPreservingScroll, syncScrollAfterListChange }
}
