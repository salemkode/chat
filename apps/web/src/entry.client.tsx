import { HydratedRouter } from 'react-router/dom'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { installDeployRecoveryHandlers } from '@/lib/deploy-recovery'
import { deleteLegacyOfflineIndexedDb } from '@/offline/local-cache'

deleteLegacyOfflineIndexedDb()
installDeployRecoveryHandlers()

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(
    registrations.map(async (registration) => {
      await registration.unregister()
    }),
  )

  if ('caches' in window) {
    const cacheKeys = await caches.keys()

    await Promise.all(
      cacheKeys.map(async (cacheKey) => {
        await caches.delete(cacheKey)
      }),
    )
  }
}

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_REACT_SCAN === '1') {
  const { scan } = await import('react-scan')

  scan({
    enabled: true,
    showToolbar: true,
  })
}

void unregisterServiceWorkers().catch(() => {
  // Ignore cleanup failures so hydration continues normally.
})

hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>,
)
