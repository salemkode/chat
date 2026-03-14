self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
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

      await self.registration.unregister()

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      })

      await Promise.all(clients.map((client) => client.navigate(client.url)))
    })(),
  )
})

self.addEventListener('fetch', () => {
  // Intentionally empty while we dismantle the legacy cache layer.
})
