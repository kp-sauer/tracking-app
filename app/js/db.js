import { SCHEMA_VERSION } from './schema.js';

// ---- Reine Daten-Helfer (testbar ohne IndexedDB) ----

export function leereDaten(welt) {
  return { welt, schema_version: SCHEMA_VERSION, profil: null, tageseintraege: {}, ereignisse: [] };
}

export function setzeTageseintrag(daten, datum, eintrag) {
  return { ...daten, tageseintraege: { ...daten.tageseintraege, [datum]: eintrag } };
}

export function entferneTageseintrag(daten, datum) {
  const kopie = { ...daten.tageseintraege };
  delete kopie[datum];
  return { ...daten, tageseintraege: kopie };
}

export function nachDatumSortiert(daten) {
  return Object.keys(daten.tageseintraege)
    .sort()
    .map(datum => ({ datum, ...daten.tageseintraege[datum] }));
}

// Jüngstes gespeichertes Gewicht mit Datum STRIKT vor datumIso (chronologisch).
// null, wenn kein früherer Eintrag existiert. Dient der Vorbelegung eines neuen Tages.
export function letzterGewichtVor(daten, datumIso) {
  const frueher = nachDatumSortiert(daten).filter(t => t.datum < datumIso);
  if (frueher.length === 0) return null;
  const letzter = frueher[frueher.length - 1];
  return typeof letzter.gewicht_kg === 'number' ? letzter.gewicht_kg : null;
}

// Jüngstes Medikament (spritze !== null) mit Datum STRIKT vor datumIso.
// Liefert {praeparat, dosis_mg, pen_anwendung} oder null. pen_anwendung wird
// im Screen für die Vorbelegung +1 gerechnet (nicht hier).
export function letztesMedikament(daten, datumIso) {
  const frueher = nachDatumSortiert(daten).filter(t => t.datum < datumIso && t.spritze);
  if (frueher.length === 0) return null;
  const s = frueher[frueher.length - 1].spritze;
  return { praeparat: s.praeparat, dosis_mg: s.dosis_mg, pen_anwendung: s.pen_anwendung };
}

// Gruppiert eine Tagesliste (wie von nachDatumSortiert, hier i.d.R. ABSTEIGEND/neueste
// zuerst übergeben) nach Kalendermonat. Reihenfolge der Gruppen und der Tage INNERHALB
// einer Gruppe entspricht der Eingabereihenfolge (keine Umsortierung). Liefert
// [{ jahr, monat, tage[] }] mit monat 1-12. Leere/ungültige Eingabe → [].
export function gruppiereNachMonat(tage) {
  if (!Array.isArray(tage)) return [];
  const gruppen = [];
  let aktuell = null;
  for (const t of tage) {
    const [j, m] = t.datum.split('-').map(Number);
    if (!aktuell || aktuell.jahr !== j || aktuell.monat !== m) {
      aktuell = { jahr: j, monat: m, tage: [] };
      gruppen.push(aktuell);
    }
    aktuell.tage.push(t);
  }
  return gruppen;
}

// Vortages-Differenz (kg) je Tag einer CHRONOLOGISCH AUFSTEIGEND sortierten Tagesliste:
// gewicht(Tag) − gewicht(unmittelbarer Vorgänger in der Liste). Der älteste Eintrag hat
// keine Differenz (null). Liefert eine Map { datum: differenz|null }. Rein/testbar.
export function vortagesDifferenzen(sortierteTageAufsteigend) {
  const map = {};
  if (!Array.isArray(sortierteTageAufsteigend)) return map;
  let vorher = null;
  for (const t of sortierteTageAufsteigend) {
    const g = t.gewicht_kg;
    if (vorher != null && typeof g === 'number' && typeof vorher === 'number') {
      map[t.datum] = Math.round((g - vorher) * 10) / 10;
    } else {
      map[t.datum] = null;
    }
    if (typeof g === 'number') vorher = g;
  }
  return map;
}

// Filtert eine nach Datum sortierte Tagesliste auf ein Zeitfenster.
// filter = { modus: 'gesamt'|'jahr'|'tage', jahr?, tage? }.
// 'jahr' = exaktes Kalenderjahr; 'tage' = letzte N Kalendertage RELATIV ZUM LETZTEN
// Eintrag (nicht zu "heute", da Testumgebung mit historischen Daten); sonst alle.
export function imZeitfenster(sortierteTage, filter = {}) {
  if (!Array.isArray(sortierteTage) || sortierteTage.length === 0) return [];
  if (filter.modus === 'jahr') {
    const praefix = String(filter.jahr) + '-';
    return sortierteTage.filter(t => t.datum.startsWith(praefix));
  }
  if (filter.modus === 'tage') {
    const letztes = tagNummer(sortierteTage[sortierteTage.length - 1].datum);
    const grenze = letztes - (filter.tage - 1);
    return sortierteTage.filter(t => tagNummer(t.datum) >= grenze);
  }
  return sortierteTage;
}

// ISO-Datum "YYYY-MM-DD" → fortlaufende Tagesnummer (UTC-basiert, zeitzonensicher).
function tagNummer(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return Math.floor(Date.UTC(j, m - 1, t) / 86400000);
}

// Index eines Dosis-Werts in der Dosis-Liste eines Präparats. Fallback 0, wenn
// der Wert (z.B. nach Präparatwechsel) nicht in der Liste vorkommt. Rein/testbar.
export function dosisIndex(liste, wert) {
  if (!Array.isArray(liste)) return 0;
  const i = liste.indexOf(wert);
  return i >= 0 ? i : 0;
}

// ---- IndexedDB-Zugriff (im Browser; in Teil 3 manuell verifiziert) ----

const DB_VERSION = 1;
const STORE = 'daten';

// Leitet den IndexedDB-Namen aus der Welt ab. Test bekommt eine EIGENE Datenbank,
// damit Test- und Produktivdaten physisch getrennt sind (auch bei gleichem Origin).
export function dbName(welt) {
  return welt === 'test' ? 'tracking-app-test' : 'tracking-app';
}

export function oeffneDb(welt) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName(welt), DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function ladeDaten(welt) {
  const db = await oeffneDb(welt);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get('haupt');
    req.onsuccess = () => resolve(req.result ?? leereDaten(welt));
    req.onerror = () => reject(req.error);
  });
}

export async function speichereDaten(daten) {
  const db = await oeffneDb(daten.welt);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(daten, 'haupt');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
