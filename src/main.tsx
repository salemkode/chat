import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

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
    <StartClient />
  </StrictMode>,
)
