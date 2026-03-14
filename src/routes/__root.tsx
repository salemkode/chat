import {
  Outlet,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect } from 'react'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import { ThemeProvider } from '@/components/theme-provider'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <LegacyServiceWorkerCleanup />
      <ThemeProvider>
        <ConvexClientProvider>
          <Outlet />
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </ConvexClientProvider>
      </ThemeProvider>
    </>
  )
}

function LegacyServiceWorkerCleanup() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('caches' in window)
    ) {
      return
    }

    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      )

      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter(
            (cacheKey) =>
              cacheKey.startsWith('salemkode-chat-') ||
              cacheKey.startsWith('workbox-'),
          )
          .map((cacheKey) => caches.delete(cacheKey)),
      )
    })()
  }, [])

  return null
}
