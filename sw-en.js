// Kept only for people who already installed the English app with an earlier version:
// their browser still checks this file for updates. From now on the Italian and English
// apps share ONE service worker, sw.js (see the explanation at the top of that file).
// Both pages now register sw.js directly; this file just loads the same code.
importScripts('sw.js');
