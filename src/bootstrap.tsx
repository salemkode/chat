import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { registerSW } from 'virtual:pwa-register'
import './styles.css'
import { router } from './router'

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('Missing root element with id "app"')
}

if ('serviceWorker' in navigator) {
  void registerSW({ immediate: true })
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
