// Service worker — "Il Metodo della Domanda / Viaggio nel buio" — v2, semplificato
// Mette in cache SOLO i file dello stesso sito (non le librerie esterne React/Babel,
// che restano gestite dalla cache normale del browser). Questo evita il problema
// della pagina vuota causato dalla cache dei file esterni nella versione precedente.
const CACHE_VERSION = 'viaggio-nel-buio-v2';
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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
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

  // File esterni (cross-origin, es. cdnjs per React/Babel): non li tocchiamo,
  // li lasciamo passare direttamente alla rete/cache normale del browser.
  if (url.origin !== self.location.origin) return;

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

  // Altri file dello stesso sito (icone, manifest...): cache-first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
