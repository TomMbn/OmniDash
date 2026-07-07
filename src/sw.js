import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

// Sans ça, un nouveau service worker reste "en attente" tant qu'un ancien onglet/instance
// de la PWA est encore ouvert — sur mobile ça peut ne jamais arriver tant qu'on ne quitte
// pas complètement l'app. skipWaiting + clientsClaim forcent la bascule immédiate.
self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'OmniDash', {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/'))
})
