/// <reference lib="webworker" />

export {}

const sw = globalThis as unknown as ServiceWorkerGlobalScope

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

sw.addEventListener('install', () => {
  void sw.skipWaiting()
})

sw.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      await clearLegacyCaches()
      await sw.registration.unregister()

      const clients = await sw.clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      })

      await Promise.all(
        clients.map((client: WindowClient) => client.navigate(client.url)),
      )
    })(),
  )
})
