const SHELL_CACHE = 'salemkode-chat-shell-v1'
const RUNTIME_CACHE = 'salemkode-chat-runtime-v1'
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/theme-init.js',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          event.waitUntil(
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy)),
          )
          return response
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request)
          if (cachedResponse) {
            return cachedResponse
          }
          return caches.match('/')
        }),
    )
    return
  }

  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            const copy = response.clone()
            event.waitUntil(
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy)),
            )
            return response
          })
          .catch(() => cached)

        return cached || networkFetch
      }),
    )
  }
})
