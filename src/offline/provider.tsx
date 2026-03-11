'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useConvex, useConvexAuth } from 'convex/react'
import { useMutation } from 'convex/react'
import { registerSW } from 'virtual:pwa-register'
import { api } from '../../convex/_generated/api'
import { offlineDb } from './db'
import { clearOfflineSession } from './session'
import { bootstrapOfflineData, flushOutbox, hydrateThreadMessages, pullThreadIndex } from './sync'

interface OfflineContextValue {
  isOnline: boolean
  isOfflineReady: boolean
  isAuthenticatedOrOffline: boolean
  isSyncing: boolean
  lastSyncAt?: number
  syncError?: string
  syncNow: () => Promise<void>
  hydrateThread: (threadId: string) => Promise<void>
  clearOfflineData: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const convex = useConvex()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const { isAuthenticated, isLoading } = useConvexAuth()
  const session = useLiveQuery(() => offlineDb.session.get('current'))
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string>()
  const hasBootstrappedRef = useRef(false)

  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    registerSW({
      immediate: true,
    })
  }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline || !isAuthenticated) {
      return
    }

    setIsSyncing(true)
    setSyncError(undefined)

    try {
      await ensureCurrentUser({})

      if (!hasBootstrappedRef.current || !session?.trusted) {
        await bootstrapOfflineData(convex)
        hasBootstrappedRef.current = true
      } else {
        await flushOutbox(convex)
        const result = await pullThreadIndex(convex)
        await Promise.all(
          result.threads
            .filter((thread) => !thread.deletedAt)
            .slice(0, 3)
            .map((thread) => hydrateThreadMessages(convex, thread.id)),
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Offline sync failed'
      setSyncError(message)
    } finally {
      setIsSyncing(false)
    }
  }, [convex, ensureCurrentUser, isAuthenticated, isOnline, session?.trusted])

  useEffect(() => {
    if (!isOnline || !isAuthenticated || isLoading) {
      return
    }

    void syncNow()

    const intervalId = window.setInterval(() => {
      void syncNow()
    }, 5 * 60 * 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, isLoading, isOnline, syncNow])

  const hydrateThread = useCallback(
    async (threadId: string) => {
      if (!isOnline || !isAuthenticated) {
        return
      }

      try {
        await hydrateThreadMessages(convex, threadId)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to hydrate thread'
        setSyncError(message)
      }
    },
    [convex, isAuthenticated, isOnline],
  )

  const clearOfflineData = useCallback(async () => {
    await clearOfflineSession()
    hasBootstrappedRef.current = false
  }, [])

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      isOfflineReady: Boolean(session?.trusted),
      isAuthenticatedOrOffline: isAuthenticated || (!isOnline && Boolean(session?.trusted)),
      isSyncing,
      lastSyncAt: session?.lastSyncedAt,
      syncError,
      syncNow,
      hydrateThread,
      clearOfflineData,
    }),
    [
      clearOfflineData,
      hydrateThread,
      isAuthenticated,
      isOnline,
      isSyncing,
      session?.lastSyncedAt,
      session?.trusted,
      syncError,
      syncNow,
    ],
  )

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  )
}

export function useOfflineContext() {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('OfflineProvider is missing from the tree')
  }
  return context
}
