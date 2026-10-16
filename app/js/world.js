// Leitet die Welt ausschließlich aus dem URL-Pfad ab (nie aus gespeicherten Daten).
// Test-Welt genau dann, wenn ein Pfadsegment exakt "test" ist.
export function weltAusPfad(pfad) {
  const segmente = pfad.split('/').filter(Boolean);
  return segmente.includes('test') ? 'test' : 'produktiv';
}

// Bequemer Zugriff im Browser (in Tests ungenutzt).
export function aktuelleWelt() {
  return weltAusPfad(globalThis.location?.pathname ?? '/');
}
