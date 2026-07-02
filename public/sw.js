// Kill switch — este dashboard ya no usa Service Worker (era del POS, eliminado del repo).
// Se desinstala solo en los navegadores donde haya quedado instalado de una versión anterior.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
      await self.registration.unregister()

      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(client => client.navigate(client.url))
    })()
  )
})
