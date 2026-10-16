import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leereDaten, setzeTageseintrag, letzterGewichtVor, letztesMedikament, dosisIndex } from '../app/js/db.js';

// ---- letzterGewichtVor ----

test('letzterGewichtVor: leere Daten → null', () => {
  const d = leereDaten('test');
  assert.equal(letzterGewichtVor(d, '2026-10-15'), null);
});

test('letzterGewichtVor: kein Eintrag strikt davor → null', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-15', { gewicht_kg: 90, spritze: null });
  d = setzeTageseintrag(d, '2026-10-16', { gewicht_kg: 91, spritze: null });
  // Eintrag am selben Tag zählt NICHT (muss strikt davor sein)
  assert.equal(letzterGewichtVor(d, '2026-10-15'), null);
});

test('letzterGewichtVor: liefert jüngsten Eintrag strikt vor dem Datum', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-10', { gewicht_kg: 88.5, spritze: null });
  d = setzeTageseintrag(d, '2026-10-13', { gewicht_kg: 89.9, spritze: null });
  d = setzeTageseintrag(d, '2026-10-20', { gewicht_kg: 92.0, spritze: null });
  // für den 15. ist der jüngste davor der 13.
  assert.equal(letzterGewichtVor(d, '2026-10-15'), 89.9);
});

test('letzterGewichtVor: Eintrag am selben Tag wird übersprungen, nimmt den davor', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-13', { gewicht_kg: 89.9, spritze: null });
  d = setzeTageseintrag(d, '2026-10-15', { gewicht_kg: 90.4, spritze: null });
  assert.equal(letzterGewichtVor(d, '2026-10-15'), 89.9);
});

// ---- letztesMedikament ----

test('letztesMedikament: leere Daten → null', () => {
  const d = leereDaten('test');
  assert.equal(letztesMedikament(d, '2026-10-15'), null);
});

test('letztesMedikament: nur Einträge ohne Spritze → null', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-10', { gewicht_kg: 88, spritze: null });
  d = setzeTageseintrag(d, '2026-10-12', { gewicht_kg: 89, spritze: null });
  assert.equal(letztesMedikament(d, '2026-10-15'), null);
});

test('letztesMedikament: liefert jüngste Spritze strikt vor dem Datum', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-08', { gewicht_kg: 88, spritze: { praeparat: 'MJ', dosis_mg: 10, pen_anwendung: 5, historie_rohtext: null } });
  d = setzeTageseintrag(d, '2026-10-11', { gewicht_kg: 89, spritze: { praeparat: 'MJ', dosis_mg: 12.5, pen_anwendung: 6, historie_rohtext: null } });
  d = setzeTageseintrag(d, '2026-10-13', { gewicht_kg: 89.5, spritze: null });
  const m = letztesMedikament(d, '2026-10-15');
  assert.deepEqual(m, { praeparat: 'MJ', dosis_mg: 12.5, pen_anwendung: 6 });
});

test('letztesMedikament: Spritze am selben Tag zählt NICHT (muss strikt davor sein)', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-11', { gewicht_kg: 89, spritze: { praeparat: 'OZ', dosis_mg: 0.5, pen_anwendung: 3, historie_rohtext: null } });
  d = setzeTageseintrag(d, '2026-10-15', { gewicht_kg: 90, spritze: { praeparat: 'WG', dosis_mg: 1.7, pen_anwendung: 9, historie_rohtext: null } });
  const m = letztesMedikament(d, '2026-10-15');
  assert.deepEqual(m, { praeparat: 'OZ', dosis_mg: 0.5, pen_anwendung: 3 });
});

test('letztesMedikament: jüngere Spritze gewinnt auch wenn spätere Tage ohne Spritze existieren', () => {
  let d = leereDaten('test');
  d = setzeTageseintrag(d, '2026-10-05', { gewicht_kg: 87, spritze: { praeparat: 'MJ', dosis_mg: 7.5, pen_anwendung: 4, historie_rohtext: null } });
  d = setzeTageseintrag(d, '2026-10-09', { gewicht_kg: 88, spritze: null });
  const m = letztesMedikament(d, '2026-10-12');
  assert.deepEqual(m, { praeparat: 'MJ', dosis_mg: 7.5, pen_anwendung: 4 });
});

// ---- dosisIndex ----

test('dosisIndex: findet Position des Werts in der Liste', () => {
  assert.equal(dosisIndex([2.5, 5, 7.5, 10, 12.5, 15], 12.5), 4);
  assert.equal(dosisIndex([0.25, 0.5, 1, 2], 0.25), 0);
});

test('dosisIndex: Fallback 0 bei nicht gefundenem Wert oder ungültiger Liste', () => {
  assert.equal(dosisIndex([2.5, 5, 7.5], 99), 0);
  assert.equal(dosisIndex(undefined, 5), 0);
});
