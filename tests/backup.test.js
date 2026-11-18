import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baueExport } from '../app/js/backup.js';

test('baueExport setzt welt, schema_version, exportiert_am und übernimmt Daten', () => {
  const daten = {
    welt: 'produktiv', schema_version: 1, profil: { koerpergroesse_m: 1.75 },
    tageseintraege: { '2026-10-14': { gewicht_kg: 95.9, spritze: null } },
    ereignisse: [],
  };
  const exp = baueExport(daten, '2026-10-14T15:32:00');
  assert.equal(exp.welt, 'produktiv');
  assert.equal(exp.schema_version, 1);
  assert.equal(exp.exportiert_am, '2026-10-14T15:32:00');
  assert.deepEqual(exp.tageseintraege, daten.tageseintraege);
  assert.deepEqual(exp.profil, daten.profil);
});

import { pruefeImport } from '../app/js/backup.js';

const gueltig = {
  welt: 'produktiv', schema_version: 1, exportiert_am: 'x',
  profil: null, tageseintraege: {}, ereignisse: [],
};

test('pruefeImport: gleiche Welt → ok', () => {
  const r = pruefeImport(gueltig, 'produktiv');
  assert.equal(r.ok, true);
});

test('pruefeImport: fremde Welt → hart blockiert', () => {
  const r = pruefeImport({ ...gueltig, welt: 'test' }, 'produktiv');
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'welt_mismatch');
});

test('pruefeImport: falsche Schema-Version → blockiert', () => {
  const r = pruefeImport({ ...gueltig, schema_version: 999 }, 'produktiv');
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'schema_version');
});

test('pruefeImport: fehlende Felder → blockiert', () => {
  const r = pruefeImport({ welt: 'produktiv' }, 'produktiv');
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'struktur');
});

import { wendeImportAn } from '../app/js/backup.js';

const bestand = {
  welt: 'produktiv', schema_version: 1, profil: { koerpergroesse_m: 1.75 },
  tageseintraege: { '2026-10-13': { gewicht_kg: 96.0, spritze: null } },
  ereignisse: [{ id: 'a', von: '2026-07-10', bis: '2026-07-20', kategorie: 'urlaub', freitext: null }],
};
const datei = {
  welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: { koerpergroesse_m: 1.80 },
  tageseintraege: { '2026-10-14': { gewicht_kg: 95.9, spritze: null } },
  ereignisse: [{ id: 'b', von: '2026-09-01', bis: '2026-09-01', kategorie: 'sport', freitext: null }],
};

test('wendeImportAn ERSETZEN: Bestand wird komplett durch Datei ersetzt', () => {
  const r = wendeImportAn(bestand, datei, 'ersetzen');
  assert.deepEqual(Object.keys(r.tageseintraege), ['2026-10-14']);
  assert.equal(r.profil.koerpergroesse_m, 1.80);
  assert.equal(r.welt, 'produktiv');
});

test('wendeImportAn MERGE: Tage vereinigt, Datei gewinnt bei Datums-Kollision', () => {
  const kollision = { ...datei, tageseintraege: { '2026-10-13': { gewicht_kg: 94.0, spritze: null } } };
  const r = wendeImportAn(bestand, kollision, 'merge');
  assert.equal(r.tageseintraege['2026-10-13'].gewicht_kg, 94.0);
});

test('wendeImportAn MERGE: Ereignisse per id dedupliziert, Datei gewinnt', () => {
  const r = wendeImportAn(bestand, datei, 'merge');
  const ids = r.ereignisse.map(e => e.id).sort();
  assert.deepEqual(ids, ['a', 'b']);
});

test('wendeImportAn ERSETZEN: Datei ohne Profil behält vorhandenes Profil (Seed-Fall)', () => {
  const bestand = {
    welt: 'test', schema_version: 1, profil: { koerpergroesse_m: 1.75, geschlecht: 'm', geburtsdatum: '1980-06-15', theme: 'system' },
    tageseintraege: { '2026-10-13': { gewicht_kg: 96.0, spritze: null } },
    ereignisse: [],
  };
  const seed = {
    welt: 'test', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: { '2024-02-22': { gewicht_kg: 116.5, spritze: null }, '2026-10-14': { gewicht_kg: 95.9, spritze: null } },
    ereignisse: [],
  };
  const r = wendeImportAn(bestand, seed, 'ersetzen');
  // Tageseinträge komplett aus Seed (Bestand verworfen):
  assert.deepEqual(Object.keys(r.tageseintraege).sort(), ['2024-02-22', '2026-10-14']);
  // ABER: vorhandenes Profil bleibt erhalten, weil Seed keines mitbringt:
  assert.ok(r.profil, 'Profil darf nicht verloren gehen');
  assert.equal(r.profil.koerpergroesse_m, 1.75);
  assert.equal(r.profil.geburtsdatum, '1980-06-15');
});

test('wendeImportAn ERSETZEN: Datei MIT Profil gewinnt weiterhin', () => {
  const bestand = { welt: 'test', schema_version: 1, profil: { koerpergroesse_m: 1.75 }, tageseintraege: {}, ereignisse: [] };
  const datei = { welt: 'test', schema_version: 1, exportiert_am: 'x', profil: { koerpergroesse_m: 1.80 }, tageseintraege: {}, ereignisse: [] };
  const r = wendeImportAn(bestand, datei, 'ersetzen');
  assert.equal(r.profil.koerpergroesse_m, 1.80);
});

import { analysiereImport } from '../app/js/backup.js';

const basisBestand = {
  welt: 'produktiv', schema_version: 1, profil: { koerpergroesse_m: 1.75 },
  tageseintraege: {
    '2026-11-13': { gewicht_kg: 92.0, spritze: null },
    '2026-11-14': { gewicht_kg: 91.9, spritze: null },
  },
  ereignisse: [],
};

test('analysiereImport: neuer Tag landet in neu', () => {
  const datei = { welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: { '2026-11-15': { gewicht_kg: 91.5, spritze: null } }, ereignisse: [] };
  const r = analysiereImport(basisBestand, datei);
  assert.deepEqual(r.neu, ['2026-11-15']);
  assert.deepEqual(r.identisch, []);
  assert.deepEqual(r.konflikte, []);
});

test('analysiereImport: inhaltsgleicher Tag landet in identisch', () => {
  const datei = { welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: { '2026-11-13': { gewicht_kg: 92.0, spritze: null } }, ereignisse: [] };
  const r = analysiereImport(basisBestand, datei);
  assert.deepEqual(r.identisch, ['2026-11-13']);
  assert.deepEqual(r.konflikte, []);
});

test('analysiereImport: abweichendes Gewicht landet in konflikte', () => {
  const datei = { welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: { '2026-11-13': { gewicht_kg: 91.8, spritze: null } }, ereignisse: [] };
  const r = analysiereImport(basisBestand, datei);
  assert.equal(r.konflikte.length, 1);
  assert.equal(r.konflikte[0].datum, '2026-11-13');
  assert.equal(r.konflikte[0].lokal.gewicht_kg, 92.0);
  assert.equal(r.konflikte[0].datei.gewicht_kg, 91.8);
});

test('analysiereImport: gleiche Gewicht aber abweichende Spritze → konflikt', () => {
  const bestand = { ...basisBestand, tageseintraege: {
    '2026-11-13': { gewicht_kg: 92.0, spritze: null } } };
  const datei = { welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: { '2026-11-13': { gewicht_kg: 92.0,
      spritze: { praeparat: 'MJ', dosis_mg: 10, pen_anwendung: 3, historie_rohtext: null } } }, ereignisse: [] };
  const r = analysiereImport(bestand, datei);
  assert.equal(r.konflikte.length, 1);
});

test('analysiereImport: Mischfall neu+identisch+konflikt', () => {
  const datei = { welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: {
      '2026-11-13': { gewicht_kg: 92.0, spritze: null },
      '2026-11-14': { gewicht_kg: 90.0, spritze: null },
      '2026-11-16': { gewicht_kg: 91.0, spritze: null },
    }, ereignisse: [] };
  const r = analysiereImport(basisBestand, datei);
  assert.deepEqual(r.neu, ['2026-11-16']);
  assert.deepEqual(r.identisch, ['2026-11-13']);
  assert.equal(r.konflikte.length, 1);
  assert.equal(r.konflikte[0].datum, '2026-11-14');
});

test('analysiereImport: mutiert die Eingaben nicht', () => {
  const datei = { welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: null,
    tageseintraege: { '2026-11-13': { gewicht_kg: 91.8, spritze: null } }, ereignisse: [] };
  const vorher = JSON.stringify(basisBestand);
  analysiereImport(basisBestand, datei);
  assert.equal(JSON.stringify(basisBestand), vorher);
});

import { wendeMergeAn } from '../app/js/backup.js';

const mBestand = {
  welt: 'produktiv', schema_version: 1, profil: { koerpergroesse_m: 1.75 },
  tageseintraege: {
    '2026-11-13': { gewicht_kg: 92.0, spritze: null },
    '2026-11-14': { gewicht_kg: 91.9, spritze: null },
  },
  ereignisse: [{ id: 'a', von: '2026-07-10', bis: '2026-07-20', kategorie: 'urlaub', freitext: null }],
};
const mDatei = {
  welt: 'produktiv', schema_version: 1, exportiert_am: 'x', profil: { koerpergroesse_m: 1.80 },
  tageseintraege: {
    '2026-11-13': { gewicht_kg: 91.8, spritze: null },
    '2026-11-15': { gewicht_kg: 91.5, spritze: null },
  },
  ereignisse: [{ id: 'b', von: '2026-09-01', bis: '2026-09-01', kategorie: 'sport', freitext: null }],
};

test('wendeMergeAn LOKAL: Konflikt bleibt lokal, neu kommt dazu', () => {
  const { bestand, zaehlung } = wendeMergeAn(mBestand, mDatei, 'lokal');
  assert.equal(bestand.tageseintraege['2026-11-13'].gewicht_kg, 92.0);
  assert.equal(bestand.tageseintraege['2026-11-15'].gewicht_kg, 91.5);
  assert.equal(bestand.tageseintraege['2026-11-14'].gewicht_kg, 91.9);
  assert.deepEqual(zaehlung, { neu: 1, aktualisiert: 0, unveraendert: 1 });
});

test('wendeMergeAn DATEI: Konflikt überschrieben, neu kommt dazu', () => {
  const { bestand, zaehlung } = wendeMergeAn(mBestand, mDatei, 'datei');
  assert.equal(bestand.tageseintraege['2026-11-13'].gewicht_kg, 91.8);
  assert.equal(bestand.tageseintraege['2026-11-15'].gewicht_kg, 91.5);
  assert.deepEqual(zaehlung, { neu: 1, aktualisiert: 1, unveraendert: 0 });
});

test('wendeMergeAn: lokaler Tag ohne Datei-Pendant bleibt immer erhalten', () => {
  const { bestand } = wendeMergeAn(mBestand, mDatei, 'datei');
  assert.equal(bestand.tageseintraege['2026-11-14'].gewicht_kg, 91.9);
});

test('wendeMergeAn: Ereignisse per id vereinigt', () => {
  const { bestand } = wendeMergeAn(mBestand, mDatei, 'lokal');
  assert.deepEqual(bestand.ereignisse.map(e => e.id).sort(), ['a', 'b']);
});

test('wendeMergeAn: Profil lokal-first (Bestand hat Profil → Datei-Profil ignoriert)', () => {
  const { bestand } = wendeMergeAn(mBestand, mDatei, 'datei');
  assert.equal(bestand.profil.koerpergroesse_m, 1.75);
});

test('wendeMergeAn: Profil aus Datei nur wenn lokal keins', () => {
  const ohneProfil = { ...mBestand, profil: null };
  const { bestand } = wendeMergeAn(ohneProfil, mDatei, 'lokal');
  assert.equal(bestand.profil.koerpergroesse_m, 1.80);
});

test('wendeMergeAn: identischer Tag zählt als unveraendert, nicht aktualisiert', () => {
  const datei = { ...mDatei, tageseintraege: {
    '2026-11-13': { gewicht_kg: 92.0, spritze: null } } };
  const { zaehlung } = wendeMergeAn(mBestand, datei, 'datei');
  assert.deepEqual(zaehlung, { neu: 0, aktualisiert: 0, unveraendert: 1 });
});

test('wendeMergeAn: mutiert die Eingaben nicht', () => {
  const vorher = JSON.stringify(mBestand);
  wendeMergeAn(mBestand, mDatei, 'datei');
  assert.equal(JSON.stringify(mBestand), vorher);
});
