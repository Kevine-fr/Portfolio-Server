// Service worker minimal pour le panneau admin.
// Strategie : network-only pour l'API et /version.js, network-first pour le reste.
// On NE met jamais en cache les reponses API (donnees sensibles + JWT).

const CACHE_NAME = 'portfolio-admin-v1';
const SHELL = ['/dashboard'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  const url = new URL(req.url);
  // Pas de cache pour l'API ou les ressources sensibles
  if (url.hostname !== self.location.hostname) return;
  if (url.pathname.startsWith('/api')) return;
  if (req.headers.get('authorization')) return;

  // Navigations : network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/dashboard').then((r) => r || Response.error()))
    );
    return;
  }

  // Next.js static assets — cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
      )
    );
  }
});
