'use client'

import * as React from 'react'
import { useAction } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Search, X } from 'lucide-react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-overlay'
import { Input } from '@/components/ui/input'

type SidebarSearchResult = FunctionReturnType<
  typeof api.sidebarSearch.searchSidebar
>[number]

function createInitialState() {
  return {
    query: '',
    results: [] as SidebarSearchResult[],
    error: null as string | null,
    isSearching: false,
  }
}

export function SidebarSearchDialog({ isOnline }: { isOnline: boolean }) {
  const navigate = useNavigate()
  const searchSidebar = useAction(api.sidebarSearch.searchSidebar)
  const [open, setOpen] = React.useState(false)
  const [searchState, setSearchState] = React.useState(createInitialState)
  const deferredQuery = React.useDeferredValue(searchState.query)
  const requestIdRef = React.useRef(0)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
        return
      }

      event.preventDefault()
      setOpen((current) => !current)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!open || !isOnline) {
      return
    }

    const query = deferredQuery.trim()
    if (!query) {
      setSearchState((current) => ({
        ...current,
        results: [],
        error: null,
        isSearching: false,
      }))
      return
    }

    const timeoutId = window.setTimeout(() => {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      setSearchState((current) => ({
        ...current,
        error: null,
        isSearching: true,
      }))

      void searchSidebar({ query, limit: 8 })
        .then((results) => {
          if (requestIdRef.current !== requestId) {
            return
          }

          setSearchState((current) => ({
            ...current,
            results,
            error: null,
            isSearching: false,
          }))
        })
        .catch((error: unknown) => {
          if (requestIdRef.current !== requestId) {
            return
          }

          setSearchState((current) => ({
            ...current,
            results: [],
            error: error instanceof Error ? error.message : 'Search failed',
            isSearching: false,
          }))
        })
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [deferredQuery, isOnline, open, searchSidebar])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      requestIdRef.current += 1
      setSearchState(createInitialState())
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mt-2 w-full justify-between bg-background text-sidebar-foreground/72 hover:bg-sidebar-accent"
        disabled={!isOnline}
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4" />
          Search chats
        </span>
        <span className="rounded-md border border-sidebar-border px-2 py-0.5 text-[11px] text-sidebar-foreground/55">
          Cmd/Ctrl+K
        </span>
      </Button>

      <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
        <ResponsiveModalContent
          size="large"
          showCloseButton={false}
          className="max-w-[46rem] gap-0 overflow-hidden rounded-[1.6rem] border border-white/8 bg-[#1f1f1f] p-0 text-white"
        >
          <div className="sr-only">
            <ResponsiveModalTitle>Search chats</ResponsiveModalTitle>
          </div>

          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/42" />
                <Input
                  autoFocus
                  value={searchState.query}
                  onChange={(event) =>
                    setSearchState((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Search across your chats"
                  className="h-12 rounded-2xl border-white/10 bg-white/4 pl-10 text-white placeholder:text-white/28 focus-visible:border-white/18 focus-visible:ring-white/10"
                />
              </div>
              <ResponsiveModalClose asChild>
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close search"
                >
                  <X className="size-4" />
                </button>
              </ResponsiveModalClose>
            </div>
          </div>

          <div className="max-h-[60vh] min-h-[18rem] overflow-y-auto">
            {!isOnline ? (
              <div className="px-5 py-10 text-center text-sm text-white/55">
                Search is unavailable while offline.
              </div>
            ) : searchState.isSearching ? (
              <div className="flex items-center justify-center gap-3 px-5 py-10 text-sm text-white/58">
                <Loader2 className="size-4 animate-spin" />
                Searching conversations...
              </div>
            ) : searchState.error ? (
              <div className="px-5 py-10 text-center text-sm text-rose-300">
                {searchState.error}
              </div>
            ) : !searchState.query.trim() ? (
              <div className="px-5 py-10 text-center text-sm text-white/55">
                Type to search across your chat history.
              </div>
            ) : searchState.results.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-white/55">
                No matching chats found.
              </div>
            ) : (
              <div className="divide-y divide-white/6">
                {searchState.results.map((result) => (
                  <button
                    key={result.messageId}
                    type="button"
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-white/5"
                    onClick={() => {
                      handleOpenChange(false)
                      void navigate({
                        to: '/$chatId',
                        params: { chatId: result.threadId },
                      })
                    }}
                  >
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4">
                      <Search className="size-4 text-white/68" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="truncate text-sm font-medium text-white">
                          {result.threadTitle}
                        </span>
                        {result.projectName ? (
                          <span className="text-xs text-white/42">
                            in {result.projectName}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/72">
                        {result.snippet}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  )
}
