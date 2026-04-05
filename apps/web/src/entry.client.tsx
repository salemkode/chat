import { HydratedRouter } from 'react-router/dom'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { deleteLegacyOfflineIndexedDb } from '@/offline/local-cache'

deleteLegacyOfflineIndexedDb()

if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_REACT_SCAN === '1') {
  const { scan } = await import('react-scan')

  scan({
    enabled: true,
    showToolbar: true,
  })
}

if ('serviceWorker' in navigator) {
  void registerSW({ immediate: true })
}

hydrateRoot(
  document,
  <StrictMode>
    <HydratedRouter />
  </StrictMode>,
)
