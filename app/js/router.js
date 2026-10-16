// Minimaler Hash-Router. Screens als Konstante; Parsing ist pure Logik.
export const SCREENS = Object.freeze([
  'onboarding', 'eingabe', 'dashboard', 'charts', 'verlauf', 'profil'
]);

export const STANDARD_SCREEN = 'dashboard';

export function routeAusHash(hash) {
  // Query-Teil (nach '?') für die Screen-Bestimmung ignorieren, damit z.B.
  // '#/eingabe?datum=2026-10-15' weiterhin den Screen 'eingabe' trifft.
  const name = (hash || '').replace(/^#\/?/, '').split('?')[0];
  return SCREENS.includes(name) ? name : STANDARD_SCREEN;
}

// Extrahiert einen 'datum'-Query-Parameter (ISO "YYYY-MM-DD") aus dem Hash, z.B.
// '#/eingabe?datum=2026-10-15' → '2026-10-15'. Liefert null, wenn kein (gültig
// geformter) Datums-Parameter vorhanden ist. Die inhaltliche Gültigkeit prüft der
// Aufrufer separat (istGueltigesDatum), hier nur das Format YYYY-MM-DD.
export function datumAusHash(hash) {
  const query = (hash || '').split('?')[1];
  if (!query) return null;
  const treffer = /(?:^|&)datum=([^&]*)/.exec(query);
  if (!treffer) return null;
  const wert = decodeURIComponent(treffer[1]);
  return /^\d{4}-\d{2}-\d{2}$/.test(wert) ? wert : null;
}
