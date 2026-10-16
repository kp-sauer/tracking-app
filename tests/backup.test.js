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
