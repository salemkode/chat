/// <reference lib="webworker" />

declare let self: ServiceWorkerGlobalScope

const CACHE_PREFIXES = ['salemkode-chat-', 'workbox-']

async function clearLegacyCaches() {
  const cacheKeys = await caches.keys()
  await Promise.all(
    cacheKeys
      .filter((cacheKey) =>
        CACHE_PREFIXES.some((prefix) => cacheKey.startsWith(prefix)),
      )
      .map((cacheKey) => caches.delete(cacheKey)),
  )
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await clearLegacyCaches()
      await self.registration.unregister()

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      })

      await Promise.all(clients.map((client) => client.navigate(client.url)))
    })(),
  )
})
