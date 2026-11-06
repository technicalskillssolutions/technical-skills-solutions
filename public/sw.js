const CACHE_NAME = 'tss-static-v17.1.0';
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const withBase = route => `${BASE_PATH}${route === '/' ? '/' : route}`;
const CORE = [
  '/', '/about/', '/tools/', '/shop/', '/software/', '/android/', '/blogs/',
  '/privacy/', '/terms/', '/contact/', '/ocr/', '/password-generator/',
  '/sip-calculator/', '/chat-link-generator/', '/email-signature/',
  '/url-shortener/', '/temporary-mail/', '/offline.html', '/manifest.webmanifest',
  '/images/logo.svg', '/icons/icon-192.png', '/icons/icon-512.png'
].map(withBase);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE.map(async url => {
      try { await cache.add(url); } catch { /* a missing optional route must not block installation */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('tss-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(withBase('/temporary-mail/')) || url.pathname.startsWith(withBase('/api/'))) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !url.pathname.startsWith(withBase('/temporary-mail/'))) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        return cached || caches.match(withBase('/offline.html'));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
