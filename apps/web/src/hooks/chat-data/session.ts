import { useAuth } from '@clerk/tanstack-react-start'
import { useEffect, useMemo } from 'react'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@chat/shared/hooks/use-online-status'
import { useQuery } from '@/lib/convex-query-cache'
import { readSession, readSettings } from '@/offline/local-cache'
import {
  cacheViewerToLocal,
  type CachedSettingsView,
  useOfflineCacheVersion,
} from '@/hooks/chat-data/shared'

export function useCachedSessionStatus() {
  const { isLoaded, isSignedIn } = useAuth()
  const isAuthenticated = isSignedIn ?? false
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const session = useMemo(() => readSession(), [cacheVersion])
  const isOfflineSessionLoaded = session !== null
  const hasTrustedOfflineSession = Boolean(session?.trusted)
  const isLoading = !isLoaded || (!isOnline && !isOfflineSessionLoaded)

  return {
    isOnline,
    isLoading,
    isOfflineReady: hasTrustedOfflineSession,
    isAuthenticatedOrOffline:
      isAuthenticated || (!isOnline && hasTrustedOfflineSession),
  }
}

export function useViewer() {
  const viewer = useQuery(api.users.viewer)
  const cacheVersion = useOfflineCacheVersion()
  const cachedSession = useMemo(() => readSession(), [cacheVersion])
  const cachedSettings = useMemo(() => readSettings(), [cacheVersion])

  useEffect(() => {
    if (!viewer) {
      return
    }

    cacheViewerToLocal(viewer, viewer.settings)
  }, [viewer])

  return useMemo(() => {
    if (viewer) {
      return {
        id: viewer._id,
        name: viewer.settings?.displayName || viewer.name,
        email: viewer.email,
        image: viewer.settings?.image || viewer.image,
        settings: viewer.settings,
        createdAt: viewer._creationTime,
      }
    }

    if (!cachedSession) {
      return null
    }

    return {
      id: cachedSession.userId,
      name: cachedSettings?.displayName || cachedSession.name,
      email: cachedSession.email,
      image: cachedSettings?.image || cachedSession.image,
      settings: cachedSettings
        ? {
            displayName: cachedSettings.displayName,
            image: cachedSettings.image,
            bio: cachedSettings.bio,
            reasoningEnabled: cachedSettings.reasoningEnabled,
            reasoningLevel: cachedSettings.reasoningLevel,
            updatedAt: cachedSettings.updatedAt,
          }
        : null,
      createdAt: undefined,
    }
  }, [cachedSession, cachedSettings, viewer])
}

export function useRoleContext() {
  const roleContext = useQuery(api.admin.getRoleContext)
  return (
    roleContext ?? {
      role: 'member' as const,
      isAdminLike: false,
    }
  )
}

export type { CachedSettingsView }
