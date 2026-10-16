// Cacht die App-Shell für Offline-Betrieb. Cache-Name pro Deploy hochzählen.
const CACHE = 'tracking-shell-v53';
const SHELL = [
  '.', 'index.html', 'css/app.css',
  'js/main.js', 'js/world.js', 'js/theme.js', 'js/router.js', 'js/icons.js', 'js/felder.js',
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
