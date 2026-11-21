// Ritiro della vecchia app "viaggio-nel-buio-pwa" (sostituita dall'app nella cartella principale).
// Chi l'aveva installata riceve questo service worker al prossimo avvio: cancella SOLO la propria
// cache ('viaggio-nel-buio-v1'), si disattiva e porta alla nuova app. Non tocca le cache di altre app
// (la versione precedente di questo file, aggiornandosi, cancellava tutte le cache del sito).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { await caches.delete('viaggio-nel-buio-v1'); } catch (e) {}
    try { await self.registration.unregister(); } catch (e) {}
    const nuova = new URL('../', self.location).href;
    const finestre = await self.clients.matchAll({ type: 'window' });
    finestre.forEach((c) => { try { c.navigate(nuova); } catch (e) {} });
  })());
});
// Nessun gestore "fetch": le richieste vanno direttamente in rete.
