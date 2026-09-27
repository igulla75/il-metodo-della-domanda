// Service worker — "Il Metodo della Domanda / Viaggio nel buio" — v3
// Mette in cache i file dello stesso sito, più le tre librerie esterne
// (React/ReactDOM/Babel) da cui dipende l'intera app: senza queste ultime,
// "funziona offline dopo la prima visita" non è vero fino in fondo, perché
// il codice dell'app non parte senza di loro. La versione precedente non le
// metteva in cache per un problema diverso (un unico URL "cross-origin
// generico" veniva messo in cache anche quando la risposta non era valida,
// mostrando poi per sempre una pagina bianca). Qui evitiamo lo stesso
// problema mettendo in cache solo questi tre URL precisi, versionati, e
// solo quando la risposta è davvero andata a buon fine (res.ok).
const CACHE_VERSION = 'viaggio-nel-buio-v3';
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
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Il "guscio" del sito: se uno di questi manca, meglio far fallire
      // subito l'installazione che avere una cache a metà.
      return cache.addAll(APP_SHELL).then(() => {
        // Le librerie esterne: tentativo "best effort", una per una — se
        // cdnjs non risponde in questo momento, l'installazione va comunque
        // a buon fine lo stesso (verranno cache al primo caricamento riuscito).
        return Promise.all(CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((res) => { if (res.ok) return cache.put(url, res); })
            .catch(() => {})
        ));
      });
    }).catch(() => {})
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

  // Le tre librerie esterne pinnate: rete prima (per restare aggiornati),
  // cache come riserva solo se offline o se cdnjs non risponde — e la
  // mettiamo in cache di nuovo solo quando la risposta è valida (res.ok),
  // mai una risposta d'errore o incompleta.
  if (CDN_ASSETS.includes(req.url)) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Qualunque altro file esterno (cross-origin): non lo tocchiamo, lo
  // lasciamo passare direttamente alla rete/cache normale del browser.
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
