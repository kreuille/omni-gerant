// zenAdmin service worker — Vague C2
// Strategie : network-first pour l'API (toujours fraiche) + cache-first pour les assets statiques.

const CACHE_NAME = 'zenadmin-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Les requetes API passent toujours par le reseau (pas de cache pour l'instant
  // car elles contiennent des donnees sensibles tenant-specifiques).
  if (url.pathname.startsWith('/api/')) return;

  // Assets Next.js build-hashed : cache long et prioritaire.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => cached ?? fetch(req).then((r) => {
          if (r.ok) cache.put(req, r.clone()).catch(() => null);
          return r;
        })),
      ),
    );
    return;
  }

  // Pages HTML : stale-while-revalidate
  if (req.mode === 'navigate' || (req.headers.get('accept') ?? '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok) caches.open(CACHE_NAME).then((c) => c.put(req, r.clone()).catch(() => null));
          return r;
        })
        .catch(() => caches.match(req).then((c) => c ?? new Response('Hors ligne', { status: 503 }))),
    );
  }
});
