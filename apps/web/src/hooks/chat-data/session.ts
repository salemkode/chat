import { resolveViewerDisplayName } from '@chat/shared/logic/display-name'
import { useAuth } from '@clerk/react-router'
import { useEffect, useMemo } from 'react'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useQuery } from 'convex/react'
import { readSession, readSettings } from '@/offline/local-cache'
import { cacheViewerToLocal, useOfflineCacheVersion } from '@/hooks/chat-data/shared'

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
    isAuthenticatedOrOffline: isAuthenticated || (!isOnline && hasTrustedOfflineSession),
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
        name: resolveViewerDisplayName({
          displayName: viewer.settings?.displayName,
          fallbackName: viewer.name,
          email: viewer.email,
        }),
        email: viewer.email,
        image: viewer.settings?.image || viewer.image,
        appPlan: viewer.appPlan,
        settings: viewer.settings,
        createdAt: viewer._creationTime,
      }
    }

    if (!cachedSession) {
      return null
    }

    return {
      id: cachedSession.userId,
      name: resolveViewerDisplayName({
        displayName: cachedSettings?.displayName,
        fallbackName: cachedSession.name,
        email: cachedSession.email,
      }),
      email: cachedSession.email,
      image: cachedSettings?.image || cachedSession.image,
      appPlan: undefined,
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

