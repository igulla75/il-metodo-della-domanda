// Service worker — "Il Metodo della Domanda / Viaggio nel buio"
// Rende l'app utilizzabile offline dopo la prima visita online.
// Cambia CACHE_VERSION quando aggiorni index.html per forzare il rinnovo della cache.
const CACHE_VERSION = 'viaggio-nel-buio-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './favicon-48.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Librerie caricate da cdnjs: servono per far girare l'app anche offline.
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(APP_SHELL).then(() =>
        Promise.all(CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'no-cors' }).then((res) => cache.put(url, res)).catch(() => {})
        ))
      )
    ).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isCDN = url.hostname === 'cdnjs.cloudflare.com';

  // Navigazione (apertura/refresh della pagina): rete prima, cache come riserva offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Librerie React/Babel da cdnjs: cache-first, non cambiano quasi mai (versioni fissate).
  if (isCDN) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req, { mode: 'no-cors' }).then((res) => {
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // Tutto il resto (stesso dominio: icone, manifest...): cache-first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
