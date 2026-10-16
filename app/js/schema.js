export const SCHEMA_VERSION = 1;

// Validierungs-Whitelist: enthält auch 'sport' aus Rückwärtskompatibilität
// (alte Seed-/Backup-Daten), obwohl 'sport' im Eingabe-UI nicht mehr angeboten wird.
export const KATEGORIEN = Object.freeze([
  'urlaub', 'feiertag_fest', 'krankheit', 'sport', 'wiesn', 'sonstiges'
]);

// Kategorien, die im Eingabe-Screen auswählbar sind (ohne 'sport', mit 'sonstiges').
export const EINGABE_KATEGORIEN = Object.freeze([
  'urlaub', 'feiertag_fest', 'krankheit', 'wiesn', 'sonstiges'
]);

export const PRAEPARATE = Object.freeze(['MJ', 'OZ', 'WG']);

export function istGueltigeKategorie(wert) {
  return KATEGORIEN.includes(wert);
}

// Ist die Kategorie im Eingabe-Screen auswählbar? (z.B. 'sport' = Alt-Kategorie → false).
export function istEingabeKategorie(wert) {
  return EINGABE_KATEGORIEN.includes(wert);
}

export function istGueltigesPraeparat(wert) {
  return PRAEPARATE.includes(wert);
}

export function istGueltigesDatum(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [j, m, t] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1, t));
  return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t;
}

function istGueltigeSpritze(s) {
  if (s === null || s === undefined) return true;
  if (!istGueltigesPraeparat(s.praeparat)) return false;
  const zahlOderNull = v => v === null || v === undefined || typeof v === 'number';
  const textOderNull = v => v === null || v === undefined || typeof v === 'string';
  return zahlOderNull(s.dosis_mg) && zahlOderNull(s.pen_anwendung) && textOderNull(s.historie_rohtext);
}

export function istGueltigerTageseintrag(e) {
  if (!e || typeof e.gewicht_kg !== 'number' || Number.isNaN(e.gewicht_kg)) return false;
  return istGueltigeSpritze(e.spritze);
}

export function istGueltigesEreignis(ev) {
  if (!ev || typeof ev.id !== 'string') return false;
  if (!istGueltigesDatum(ev.von) || !istGueltigesDatum(ev.bis)) return false;
  if (ev.bis < ev.von) return false;
  if (!istGueltigeKategorie(ev.kategorie)) return false;
  return ev.freitext === null || ev.freitext === undefined || typeof ev.freitext === 'string';
}
