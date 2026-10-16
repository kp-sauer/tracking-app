// Löst die gespeicherte Theme-Wahl zur effektiven Anzeige auf.
// wahl: 'hell' | 'dunkel' | 'system'. prefersDark: Boolean aus matchMedia.
export function effektivesTheme(wahl, prefersDark) {
  if (wahl === 'hell' || wahl === 'dunkel') return wahl;
  return prefersDark ? 'dunkel' : 'hell';
}

// Erlaubte Anzeige-Skalierungsstufen (Prozent). Standard = 100 (kein Zoom).
export const SKALA_STUFEN = [90, 100, 110, 120, 130];

// Normalisiert einen gespeicherten Skala-Wert auf eine erlaubte Stufe.
// Fehlend/ungültig → 100; krumme Werte rasten auf die nächstgelegene Stufe
// (bei Gleichstand gewinnt die untere); Extremwerte werden geklemmt.
export function effektiveSkala(wert) {
  if (wert === null || wert === undefined || wert === '') return 100;
  const n = Number(wert);
  if (!Number.isFinite(n)) return 100;
  let beste = SKALA_STUFEN[0];
  for (const s of SKALA_STUFEN) {
    if (Math.abs(s - n) < Math.abs(beste - n)) beste = s;
  }
  return beste;
}
