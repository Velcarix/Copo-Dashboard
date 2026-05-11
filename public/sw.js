// Service Worker — Copo POS
// Estrategia:
//   - index.html: siempre red (nunca cacheado — el hash del JS cambia en cada deploy)
//   - /assets/*: Cache First + se cachean al vuelo (nombres con hash → inmutables)
//   - /api/*: no interceptar (manejo desde el frontend)

const CACHE_VERSION = 'copo-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // No interceptar la API
  if (url.pathname.startsWith('/api/')) return

  // Navegación HTML → siempre red, fallback a caché solo si offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Assets con hash (JS/CSS/imágenes) → Cache First, se guardan al vuelo
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
