// Service worker UNICO — "Il Metodo della Domanda" (index.html) e
// "The Method of the Question" (index-en.html) — v4
//
// Perché uno solo: le due app stanno nella stessa cartella del sito, quindi il browser
// consente un solo service worker per entrambe. Prima ce n'erano due (sw.js e sw-en.js)
// che si sostituivano a vicenda: aprire una lingua cancellava la memoria offline dell'altra.
//
// QUANDO AGGIORNI I FILE DEL SITO: cambia il numero in CACHE (es. 'v4' -> 'v5'),
// così chi ha già l'app riceve la versione nuova anche offline.

const CACHE = 'metodo-domanda-v4';
const PREFIX = 'metodo-domanda-';
// Nomi usati dalle versioni precedenti di QUESTA app: vengono eliminati all'attivazione.
// Nessun'altra cache del sito viene toccata (sullo stesso indirizzo igulla75.github.io
// possono esserci altre app, con le loro cache). 'viaggio-nel-buio-v1' NON è in elenco:
// la usa ancora la vecchia app della cartella viaggio-nel-buio-pwa/ (finché resta pubblicata).
const OLD_CACHES = ['viaggio-nel-buio-v2', 'viaggio-nel-buio-v3', 'journey-into-the-dark-en-v1'];

// Indispensabili: se uno manca, l'installazione fallisce e resta in funzione la versione precedente
// (meglio che dichiararsi "pronto per l'offline" con una cache a metà).
const CORE = [
  './',
  './index.html',
  './index-en.html',
  './manifest.json',
  './manifest-en.json',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './favicon-48.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  // le tre librerie senza le quali l'app non parte (ospitate nel sito: React, ReactDOM, Babel)
  './react.production.min.js',
  './react-dom.production.min.js',
  './babel.min.js'
];
// Pagine collegate (leggere): tentativo una per una, un errore non blocca l'installazione.
const PAGES = [
  './libro.html',
  './audiolibro.html',
  './audiolibro-en.html',
  './articolo-notizie-voto.html',
  './articolo-notizie-voto-en.html',
  './yoga-nidra.html'
];
// Gli schemi del libro (img-*.jpg) NON sono in questo elenco: li chiede la pagina stessa,
// solo quelli della sua lingua (vedi il messaggio 'cache-urls' più sotto).

function bestEffort(cache, urls) {
  return Promise.all(urls.map((url) =>
    cache.match(url).then((hit) => hit || fetch(url).then((res) => { if (res.ok) return cache.put(url, res); }))
      .catch(() => {})
  ));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(CORE).then(() => bestEffort(cache, PAGES))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names
      .filter((n) => n !== CACHE && (n.startsWith(PREFIX) || OLD_CACHES.includes(n)))
      .map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

// La pagina chiede di tenere offline i "suoi" schemi del libro (solo indirizzi di questo sito).
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'cache-urls' || !Array.isArray(data.urls)) return;
  const urls = data.urls
    .map((u) => { try { return new URL(u, self.registration.scope); } catch (e) { return null; } })
    .filter((u) => u && u.origin === self.location.origin)
    .map((u) => u.href);
  event.waitUntil(caches.open(CACHE).then((cache) => bestEffort(cache, urls)));
});

// Chiave di cache di una pagina: l'indirizzo reale, senza "?..." e "#...".
function pageKey(url) {
  const u = new URL(url);
  u.search = ''; u.hash = '';
  return u.href;
}
// Pagina di riserva offline, nella lingua giusta, per pagine mai visitate.
function fallbackFor(url) {
  return /-en\.html$/.test(new URL(url).pathname) ? './index-en.html' : './index.html';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Qualunque altro indirizzo esterno (font, archive.org...): non lo tocchiamo.
  if (url.origin !== self.location.origin) return;

  // Audio (mp3) e richieste "a pezzi" (Range): direttamente alla rete, senza salvarle
  // (file grandi: lo Yoga Nidra da solo supera i 50 MB).
  if (req.headers.has('range') || /\.mp3$/i.test(url.pathname)) return;

  // Apertura di una pagina: rete prima; la copia viene salvata con il SUO indirizzo
  // (prima tutte finivano sotto index.html, e offline compariva la pagina sbagliata).
  if (req.mode === 'navigate') {
    const key = pageKey(req.url);
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
        return res;
      }).catch(() =>
        caches.match(key).then((hit) => hit || caches.match(fallbackFor(req.url)))
      )
    );
    return;
  }

  // Altri file del sito (icone, immagini, manifest...): prima la copia salvata, altrimenti la rete
  // (e la risposta valida viene salvata per la prossima volta offline).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
