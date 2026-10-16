import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leereDaten, setzeTageseintrag, entferneTageseintrag, nachDatumSortiert } from '../app/js/db.js';

test('leereDaten liefert leere, welt-getaggte Struktur', () => {
  const d = leereDaten('test');
  assert.equal(d.welt, 'test');
  assert.equal(d.schema_version, 1);
  assert.deepEqual(d.tageseintraege, {});
  assert.deepEqual(d.ereignisse, []);
});

test('setzeTageseintrag fügt per Datum-Key ein (immutabel)', () => {
  const d0 = leereDaten('produktiv');
  const d1 = setzeTageseintrag(d0, '2026-10-14', { gewicht_kg: 95.9 });
  assert.equal(d1.tageseintraege['2026-10-14'].gewicht_kg, 95.9);
  assert.deepEqual(d0.tageseintraege, {});
});

test('entferneTageseintrag löscht per Key', () => {
  let d = leereDaten('produktiv');
  d = setzeTageseintrag(d, '2026-10-14', { gewicht_kg: 95.9 });
  d = entferneTageseintrag(d, '2026-10-14');
  assert.equal(d.tageseintraege['2026-10-14'], undefined);
});

test('nachDatumSortiert liefert aufsteigend sortierte [{datum, ...}]', () => {
  let d = leereDaten('produktiv');
  d = setzeTageseintrag(d, '2026-10-14', { gewicht_kg: 95 });
  d = setzeTageseintrag(d, '2026-01-02', { gewicht_kg: 99 });
  const liste = nachDatumSortiert(d);
  assert.deepEqual(liste.map(t => t.datum), ['2026-01-02', '2026-10-14']);
  assert.equal(liste[0].gewicht_kg, 99);
});

import { gruppiereNachMonat, vortagesDifferenzen } from '../app/js/db.js';

test('gruppiereNachMonat gruppiert nach Monat, erhält Reihenfolge', () => {
  const tage = [
    { datum: '2026-10-15', gewicht_kg: 90.8 },
    { datum: '2026-10-14', gewicht_kg: 91.1 },
    { datum: '2026-09-30', gewicht_kg: 92.4 },
  ];
  const g = gruppiereNachMonat(tage);
  assert.equal(g.length, 2);
  assert.deepEqual({ jahr: g[0].jahr, monat: g[0].monat }, { jahr: 2026, monat: 10 });
  assert.equal(g[0].tage.length, 2);
  assert.deepEqual({ jahr: g[1].jahr, monat: g[1].monat }, { jahr: 2026, monat: 9 });
  assert.equal(g[1].tage.length, 1);
});

test('gruppiereNachMonat erkennt Jahreswechsel als eigene Gruppe', () => {
  const tage = [
    { datum: '2027-01-02', gewicht_kg: 88 },
    { datum: '2026-12-31', gewicht_kg: 89 },
  ];
  const g = gruppiereNachMonat(tage);
  assert.equal(g.length, 2);
  assert.deepEqual([g[0].jahr, g[0].monat], [2027, 1]);
  assert.deepEqual([g[1].jahr, g[1].monat], [2026, 12]);
});

test('gruppiereNachMonat: leere/ungültige Eingabe → []', () => {
  assert.deepEqual(gruppiereNachMonat([]), []);
  assert.deepEqual(gruppiereNachMonat(null), []);
});

test('vortagesDifferenzen: Differenz zum chronologischen Vortag, ältester = null', () => {
  const tage = [
    { datum: '2026-10-12', gewicht_kg: 91.3 },
    { datum: '2026-10-13', gewicht_kg: 91.1 },
    { datum: '2026-10-14', gewicht_kg: 91.5 },
  ];
  const d = vortagesDifferenzen(tage);
  assert.equal(d['2026-10-12'], null);
  assert.equal(d['2026-10-13'], -0.2);
  assert.equal(d['2026-10-14'], 0.4);
});

test('vortagesDifferenzen rundet auf eine Nachkommastelle', () => {
  const d = vortagesDifferenzen([
    { datum: '2026-10-01', gewicht_kg: 90.0 },
    { datum: '2026-10-02', gewicht_kg: 89.7 },
  ]);
  assert.equal(d['2026-10-02'], -0.3);
});

import { dbName } from '../app/js/db.js';

test('dbName: test-Welt bekommt eigene Datenbank', () => {
  assert.equal(dbName('test'), 'tracking-app-test');
});

test('dbName: produktiv behält den Standard-Namen', () => {
  assert.equal(dbName('produktiv'), 'tracking-app');
});

test('dbName: unbekannte/leere Welt fällt auf produktiv-Namen zurück (kein Test-Topf)', () => {
  assert.equal(dbName(undefined), 'tracking-app');
  assert.equal(dbName('quatsch'), 'tracking-app');
});
