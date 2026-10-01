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
// Whenever index.html is updated, bump CACHE_NAME below (e.g. v1 -> v2) —
// this isn't just housekeeping, it's what makes every device notice there
// is a new version at all and go fetch it.
// ============================================================

const CACHE_NAME = 'ssa-app-v2';
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

  // The app page itself (index.html / the app's URL) ALWAYS tries the
  // network first. This is what makes a new deploy show up the very next
  // time someone opens the app, instead of needing several reloads before
  // the old cached copy finally gets replaced. Offline, it still falls
  // back to whatever was last cached, so the app keeps working with no
  // signal at all.
  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else (icons, manifest, fonts, PDF/Excel libraries) rarely
  // changes, so these still serve instantly from cache while quietly
  // refreshing in the background — keeps the app feeling fast and fully
  // usable offline.
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
      return cached || networkFetch;
    })
  );
});
