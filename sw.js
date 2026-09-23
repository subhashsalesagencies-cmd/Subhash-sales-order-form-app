// ============================================================
// Subhash Sales Agencies — Offline Service Worker
// ============================================================
// WHAT THIS DOES:
// Caches the app itself (the HTML/CSS/JS, fonts, and the PDF/Excel
// libraries) so the app can open and be used with NO internet connection
// at all — just like an installed piece of software. Orders created while
// offline are saved on the device (see index.html) and automatically sync
// to Google Sheets the moment internet is back.
//
// IMPORTANT: this file NEVER caches calls to Google Sheets itself — every
// request to script.google.com always goes straight to the network, so
// data always stays live and correct when online.
//
// HOW TO UPDATE:
// Whenever index.html is updated, bump CACHE_NAME below (e.g. v1 -> v2) so
// every device picks up the new cached version instead of an old one.
// ============================================================

const CACHE_NAME = 'ssa-app-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((e) => console.error('Service worker install caching failed', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Never touch the Google Sheets backend — always live network, never cached.
  if (req.url.indexOf('script.google.com') !== -1) return;

  // Only handle simple page/asset loads.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      // Serve from cache instantly if we have it (fast + works offline),
      // while quietly refreshing the cache in the background when online.
      return cached || networkFetch;
    })
  );
});
