import { resolveViewerDisplayName } from '@chat/core/logic/display-name'
import { useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/react-router'
import { api } from '@convex/_generated/api'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { useConvexAuth, useQuery } from 'convex/react'
import { readSession, readSettings } from '@/offline/local-cache'
import { cacheViewerToLocal, useOfflineCacheVersion } from '@/hooks/chat-data/shared'

export function resolveCachedSessionStatus(args: {
  isClerkLoaded: boolean
  isClerkSignedIn: boolean
  isConvexAuthLoading: boolean
  isConvexAuthenticated: boolean
  isOnline: boolean
  hasTrustedOfflineSession: boolean
  isOfflineSessionLoaded: boolean
}) {
  const isWaitingForConvexSession =
    args.isClerkLoaded && args.isClerkSignedIn && !args.isConvexAuthenticated
  const isLoading =
    !args.isClerkLoaded ||
    args.isConvexAuthLoading ||
    isWaitingForConvexSession ||
    (!args.isOnline && !args.isOfflineSessionLoaded)

  return {
    isLoading,
    isOfflineReady: args.hasTrustedOfflineSession,
    isAuthenticatedOrOffline:
      args.isConvexAuthenticated || (!args.isOnline && args.hasTrustedOfflineSession),
  }
}

export function useCachedSessionStatus() {
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth()
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth()
  const { isOnline } = useOnlineStatus()
  const cacheVersion = useOfflineCacheVersion()
  const session = useMemo(() => readSession(), [cacheVersion])
  const isOfflineSessionLoaded = session !== null
  const hasTrustedOfflineSession = Boolean(session?.trusted)

  return {
    isOnline,
    ...resolveCachedSessionStatus({
      isClerkLoaded,
      isClerkSignedIn: isSignedIn ?? false,
      isConvexAuthLoading,
      isConvexAuthenticated: isAuthenticated,
      isOnline,
      hasTrustedOfflineSession,
      isOfflineSessionLoaded,
    }),
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
