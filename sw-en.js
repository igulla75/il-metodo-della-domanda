// Service worker — "The Method of the Question / Journey into the Dark" (English) — v1
// Caches the site's own files, plus the three external libraries
// (React/ReactDOM/Babel) the whole app depends on: without these, "works
// offline after the first visit" wouldn't really be true, because the
// app's code can't start without them. These are cached only when the
// response is actually successful (res.ok), and only for these three
// precise, versioned URLs, to avoid ever caching an invalid or generic
// cross-origin response.
const CACHE_VERSION = 'journey-into-the-dark-en-v1';
const APP_SHELL = [
  './',
  './index-en.html',
  './manifest-en.json',
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
      // The site's "shell": if any of these is missing, it's better to
      // fail the install outright than to have a half-finished cache.
      return cache.addAll(APP_SHELL).then(() => {
        // The external libraries: a "best effort" attempt, one by one — if
        // cdnjs doesn't respond right now, the install still succeeds
        // (they'll be cached on the first successful load).
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

  // The three pinned external libraries: network first (to stay up to
  // date), cache only as a fallback if offline or if cdnjs doesn't
  // respond — and we cache it again only when the response is valid
  // (res.ok), never an error or incomplete response.
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

  // Any other external (cross-origin) file: leave it alone, let it pass
  // straight through to the browser's normal network/cache handling.
  if (url.origin !== self.location.origin) return;

  // Navigation (opening/refreshing the page): network first, cache as an offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('./index-en.html', copy));
          return res;
        })
        .catch(() => caches.match('./index-en.html'))
    );
    return;
  }

  // Other files from the same site (icons, manifest...): cache-first.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});
