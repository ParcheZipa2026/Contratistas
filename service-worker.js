/* Service Worker — Parche Zipa PWA
   Estrategia:
   - App shell: cache-first (carga instantánea offline).
   - API (Apps Script): network-first (datos siempre frescos, fallback a cache).
   Sube la versión para invalidar la caché tras un despliegue. */
const VERSION = 'pz-v1.0.0';
const SHELL = `shell-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './manifest.webmanifest',
  './assets/logo.svg',
  './js/app.js',
  './js/config.js',
  './js/api.js',
  './js/store.js',
  './js/router.js',
  './js/ui.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // API de Apps Script: network-first
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(`api-${VERSION}`).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Shell / estáticos: cache-first
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
