import { SCHEMA_VERSION } from './schema.js';

// Baut das Export-Objekt (Hülle gem. Datenmodell) aus dem aktuellen Datenbestand.
export function baueExport(daten, exportiertAmIso) {
  return {
    welt: daten.welt,
    schema_version: SCHEMA_VERSION,
    exportiert_am: exportiertAmIso ?? new Date().toISOString(),
    profil: daten.profil ?? null,
    tageseintraege: daten.tageseintraege ?? {},
    ereignisse: daten.ereignisse ?? [],
  };
}

// Harte Prüfung einer Import-Datei gegen die aktuelle Welt.
// Fremde Welt wird hart blockiert (kein Umgehungs-Pfad).
export function pruefeImport(datei, aktuelleWelt) {
  if (!datei || typeof datei !== 'object'
      || !('welt' in datei) || !('schema_version' in datei)
      || typeof datei.tageseintraege !== 'object' || !Array.isArray(datei.ereignisse)) {
    return { ok: false, grund: 'struktur' };
  }
  if (datei.schema_version !== SCHEMA_VERSION) {
    return { ok: false, grund: 'schema_version' };
  }
  if (datei.welt !== aktuelleWelt) {
    return { ok: false, grund: 'welt_mismatch' };
  }
  return { ok: true };
}

// Wendet eine geprüfte Import-Datei auf den Bestand an.
// modus: 'ersetzen' (Bestand verwerfen) | 'merge' (vereinigen, Datei gewinnt bei Kollision).
export function wendeImportAn(bestand, datei, modus) {
  if (modus === 'ersetzen') {
    return {
      welt: bestand.welt,
      schema_version: SCHEMA_VERSION,
      profil: datei.profil ?? bestand.profil ?? null,
      tageseintraege: { ...datei.tageseintraege },
      ereignisse: [...datei.ereignisse],
    };
  }
  const tage = { ...bestand.tageseintraege, ...datei.tageseintraege };
  const perId = new Map();
  for (const e of bestand.ereignisse) perId.set(e.id, e);
  for (const e of datei.ereignisse) perId.set(e.id, e);
  return {
    welt: bestand.welt,
    schema_version: SCHEMA_VERSION,
    profil: datei.profil ?? bestand.profil ?? null,
    tageseintraege: tage,
    ereignisse: [...perId.values()],
  };
}

// Analysiert eine (bereits welt-geprüfte) Datei gegen den Bestand.
// Betrachtet NUR tageseintraege. Ereignisse/Profil werden hier nicht geprüft.
export function analysiereImport(bestand, datei) {
  const lokal = bestand.tageseintraege ?? {};
  const fremd = datei.tageseintraege ?? {};
  const neu = [];
  const identisch = [];
  const konflikte = [];
  for (const datum of Object.keys(fremd)) {
    if (!(datum in lokal)) {
      neu.push(datum);
    } else if (JSON.stringify(lokal[datum]) === JSON.stringify(fremd[datum])) {
      identisch.push(datum);
    } else {
      konflikte.push({ datum, lokal: lokal[datum], datei: fremd[datum] });
    }
  }
  return { neu, identisch, konflikte };
}

// Wendet einen Merge mit expliziter Konfliktwahl an und liefert eine Zählung.
// konfliktWahl: 'datei' (Kollisionen überschreiben) | 'lokal' (Kollisionen behalten).
export function wendeMergeAn(bestand, datei, konfliktWahl) {
  const { neu, identisch, konflikte } = analysiereImport(bestand, datei);
  const tage = { ...bestand.tageseintraege };
  for (const datum of neu) tage[datum] = datei.tageseintraege[datum];
  if (konfliktWahl === 'datei') {
    for (const k of konflikte) tage[k.datum] = datei.tageseintraege[k.datum];
  }
  const perId = new Map();
  for (const e of (bestand.ereignisse ?? [])) perId.set(e.id, e);
  for (const e of (datei.ereignisse ?? [])) perId.set(e.id, e);
  return {
    bestand: {
      welt: bestand.welt,
      schema_version: SCHEMA_VERSION,
      profil: bestand.profil ?? datei.profil ?? null,
      tageseintraege: tage,
      ereignisse: [...perId.values()],
    },
    zaehlung: {
      neu: neu.length,
      aktualisiert: konfliktWahl === 'datei' ? konflikte.length : 0,
      unveraendert: identisch.length + (konfliktWahl === 'lokal' ? konflikte.length : 0),
    },
  };
}
