// Cacht die App-Shell für Offline-Betrieb. Version kommt zentral aus js/version.js
// (importScripts, da klassischer Worker) → EINE Quelle für UI und Cache-Name.
//
// WICHTIG beim Versionswechsel: NEBEN js/version.js MUSS auch die BUILD-Zeile unten
// hochgezählt werden! Der Browser installiert einen neuen Service Worker nur, wenn sich
// die Datei sw.js SELBST byteweise ändert. Da der Cache-Name hier via importScripts aus
// version.js kommt, bliebe sw.js sonst unverändert → kein SW-Update → alte Version klebt
// fest (war ein realer Bug: v63→v70 kamen nie am Gerät an). Die BUILD-Zeile erzwingt den
// Byte-Unterschied. Sie MUSS mit js/version.js übereinstimmen.
const BUILD = '75';
importScripts('js/version.js');
const CACHE = 'tracking-shell-v' + self.APP_VERSION;
// Selbstkontrolle: fällt auf, wenn beim Deploy nur eine der beiden Stellen hochgezählt wurde.
if (BUILD !== self.APP_VERSION) {
  console.warn('[sw] BUILD (' + BUILD + ') != APP_VERSION (' + self.APP_VERSION + ') — version.js und sw.js-BUILD müssen übereinstimmen.');
}
const SHELL = [
  '.', 'index.html', 'css/app.css',
  'js/main.js', 'js/world.js', 'js/theme.js', 'js/router.js', 'js/icons.js', 'js/felder.js', 'js/version.js',
  'vendor/uPlot.iife.min.js', 'vendor/uPlot.min.css',
  'manifest.webmanifest',
];

// Dupliziert aus app/js/sw-strategie.js (dort per node:test geprüft). Klassischer
// Worker ohne type:module → kein ES-import möglich, daher die Mini-Funktion hier erneut.
// 'vendor' = cache-first (uPlot ändert sich nie), 'app' = network-first.
function strategieFuer(pathname) {
  return pathname.includes('/vendor/') ? 'vendor' : 'app';
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first: Treffer sofort liefern, sonst Netz holen und ablegen.
function cacheFirst(req) {
  return caches.match(req).then((treffer) => treffer || fetch(req).then((antwort) => {
    const kopie = antwort.clone();
    caches.open(CACHE).then((c) => c.put(req, kopie));
    return antwort;
  }));
}

// Network-first: Netz zuerst (frische App-Dateien → Updates kommen sofort an),
// erfolgreiche Antwort in den Cache; offline → gecachte Version als Fallback.
function networkFirst(req) {
  return fetch(req).then((antwort) => {
    const kopie = antwort.clone();
    caches.open(CACHE).then((c) => c.put(req, kopie));
    return antwort;
  }).catch(() => caches.match(req));
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // Cross-origin durchreichen
  const strategie = strategieFuer(url.pathname);
  e.respondWith(strategie === 'vendor' ? cacheFirst(e.request) : networkFirst(e.request));
});
