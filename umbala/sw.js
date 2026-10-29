// Service Worker for Umbala Admin PWA
const CACHE_NAME = 'umbala-admin-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Do not intercept Firebase or external API calls
  if (url.origin !== location.origin) return;

  // Network first with cache fallback
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => {
            try { c.put(e.request, clone); } catch (err) {}
          });
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
