// Service Worker — Copo POS
// Estrategia: Cache First para assets estáticos
// Network First para /api/v1/products (catálogo)
// Background Sync para /api/v1/orders (ventas offline)

const CACHE_VERSION = 'copo-v1'
const STATIC_ASSETS = ['/', '/index.html']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

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

  // No interceptar peticiones a la API en fetch handler — se manejan desde el frontend
  if (url.pathname.startsWith('/api/')) return

  // Cache First para assets estáticos
  event.respondWith(
    caches.match(event.request).then(cached => cached ?? fetch(event.request))
  )
})
