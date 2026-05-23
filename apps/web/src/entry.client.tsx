import { HydratedRouter } from 'react-router/dom'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { installDeployRecoveryHandlers, attemptDeployRecovery } from '@/lib/deploy-recovery'
import { deleteLegacyOfflineIndexedDb } from '@/offline/local-cache'

deleteLegacyOfflineIndexedDb()
installDeployRecoveryHandlers()

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_REACT_SCAN === '1') {
  const { scan } = await import('react-scan')

  scan({
    enabled: true,
    showToolbar: true,
  })
}

if ('serviceWorker' in navigator) {
  void registerSW({
    immediate: true,
    onNeedRefresh() {
      attemptDeployRecovery('service-worker')
    },
  })
}

hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>,
)
