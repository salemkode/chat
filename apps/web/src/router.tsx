import { createRouter } from '@tanstack/react-router'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    throw new Error('missing VITE_CONVEX_URL envar')
  }
  const convex = new ConvexReactClient(CONVEX_URL, {
    unsavedChangesWarning: false,
  })

  // @snippet start example
  const router = 
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      scrollRestoration: true,
      defaultPreloadStaleTime: 0, // Let React Query handle all caching
      defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
      defaultNotFoundComponent: () => <p>not found</p>,
      context: { convexClient: convex },
      Wrap: ({ children }) => (
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      ),
    })
  // @snippet end example

  return router
}