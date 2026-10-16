// Reine Routing-Entscheidung für den Service-Worker: welche Caching-Strategie gilt
// für einen Pfad? Ausgelagert, damit die Logik ohne SW-Globals (self/caches/fetch)
// per node:test prüfbar ist. sw.js dupliziert diese Funktion bewusst (klassischer
// Worker, kein type:module → kein ES-import möglich).
//
// 'vendor' = cache-first (uPlot ändert sich nie, spart Netzwerk-Roundtrip)
// 'app'    = network-first (Updates sollen sofort ankommen, nicht erst nach hartem Reload)
export function strategieFuer(pathname) {
  return pathname.includes('/vendor/') ? 'vendor' : 'app';
}
