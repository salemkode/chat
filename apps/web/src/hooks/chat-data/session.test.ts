import { describe, expect, it } from 'vitest'
import { resolveCachedSessionStatus } from './session'

describe('resolveCachedSessionStatus', () => {
  it('keeps the route loading while Clerk is signed in and Convex is still syncing', () => {
    expect(
      resolveCachedSessionStatus({
        isClerkLoaded: true,
        isClerkSignedIn: true,
        isConvexAuthLoading: false,
        isConvexAuthenticated: false,
        isOnline: true,
        hasTrustedOfflineSession: false,
        isOfflineSessionLoaded: false,
      }),
    ).toEqual({
      isLoading: true,
      isOfflineReady: false,
      isAuthenticatedOrOffline: false,
    })
  })

  it('redirects only after both auth layers agree the user is signed out', () => {
    expect(
      resolveCachedSessionStatus({
        isClerkLoaded: true,
        isClerkSignedIn: false,
        isConvexAuthLoading: false,
        isConvexAuthenticated: false,
        isOnline: true,
        hasTrustedOfflineSession: false,
        isOfflineSessionLoaded: false,
      }),
    ).toEqual({
      isLoading: false,
      isOfflineReady: false,
      isAuthenticatedOrOffline: false,
    })
  })

  it('allows trusted offline access when the network is unavailable', () => {
    expect(
      resolveCachedSessionStatus({
        isClerkLoaded: true,
        isClerkSignedIn: false,
        isConvexAuthLoading: false,
        isConvexAuthenticated: false,
        isOnline: false,
        hasTrustedOfflineSession: true,
        isOfflineSessionLoaded: true,
      }),
    ).toEqual({
      isLoading: false,
      isOfflineReady: true,
      isAuthenticatedOrOffline: true,
    })
  })
})
