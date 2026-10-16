import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmi, zielgewicht, lineareTrend } from '../app/js/calc.js';

test('bmi: aktuelles Gewicht 95.9 bei 1.75 m ≈ 31.31 (Excel-Wert)', () => {
  assert.ok(Math.abs(bmi(95.9, 1.75) - 31.31) < 0.01);
});

test('zielgewicht: BMI 30 bei 1.75 m = 91.875 kg (Excel-Wert)', () => {
  assert.ok(Math.abs(zielgewicht(30, 1.75) - 91.875) < 1e-6);
});

test('zielgewicht: BMI 25 bei 1.75 m = 76.5625 kg (Excel-Wert)', () => {
  assert.ok(Math.abs(zielgewicht(25, 1.75) - 76.5625) < 1e-6);
});

import { diff, gesamtverlust } from '../app/js/calc.js';

test('diff: Vortag − heute, positiv = Abnahme', () => {
  assert.equal(diff(97.0, 96.5), 0.5);
  assert.equal(diff(96.5, 97.0), -0.5);
});

test('gesamtverlust: erstes 116.5 − aktuell 95.9 = 20.6 kg', () => {
  assert.ok(Math.abs(gesamtverlust(116.5, 95.9) - 20.6) < 1e-6);
});

import { wAvg, wAvgDiff } from '../app/js/calc.js';

test('wAvg: Durchschnitt der 7 Gewichte eines Fensters', () => {
  const fenster = [97, 97, 96.5, 96.5, 96, 96, 95.5];
  const erwartet = (97 + 97 + 96.5 + 96.5 + 96 + 96 + 95.5) / 7;
  assert.ok(Math.abs(wAvg(fenster) - erwartet) < 1e-9);
});

test('wAvg: weniger als 7 Werte → null', () => {
  assert.equal(wAvg([97, 96.5, 96]), null);
});

test('wAvgDiff: Gewicht vor 7 Tagen − aktueller 7-Tage-Schnitt', () => {
  assert.ok(Math.abs(wAvgDiff(97.0, 96.0) - 1.0) < 1e-9);
});

import { alter, kalenderwoche, wochentag } from '../app/js/calc.js';

test('alter: geboren 1980-10-15, Stichtag 2026-10-14 → 45 (Tag davor)', () => {
  assert.equal(alter('1980-10-15', '2026-10-14'), 45);
});

test('alter: geboren 1980-10-14, Stichtag 2026-10-14 → 46 (Geburtstag)', () => {
  assert.equal(alter('1980-10-14', '2026-10-14'), 46);
});

test('kalenderwoche: 2026-01-01 liegt in ISO-KW 1', () => {
  assert.equal(kalenderwoche('2026-01-01'), 1);
});

test('wochentag: 2026-10-14 ist ein Mittwoch', () => {
  assert.equal(wochentag('2026-10-14'), 'Mi');
});

import { wAvgSerie } from '../app/js/calc.js';

test('wAvgSerie: erste 6 Tage null, ab dem 7. ein Wert', () => {
  const tage = [
    { datum: '2026-01-01', gewicht_kg: 100 },
    { datum: '2026-01-02', gewicht_kg: 100 },
    { datum: '2026-01-03', gewicht_kg: 100 },
    { datum: '2026-01-04', gewicht_kg: 100 },
    { datum: '2026-01-05', gewicht_kg: 100 },
    { datum: '2026-01-06', gewicht_kg: 100 },
    { datum: '2026-01-07', gewicht_kg: 100 },
  ];
  const serie = wAvgSerie(tage);
  assert.equal(serie[0].w_avg, null);
  assert.equal(serie[5].w_avg, null);
  assert.ok(Math.abs(serie[6].w_avg - 100) < 1e-9);
});

test('kalenderwoche: Jahreswechsel-Grenzfälle (ISO-8601)', () => {
  assert.equal(kalenderwoche('2025-12-29'), 1);   // Mo → KW1 von 2026
  assert.equal(kalenderwoche('2023-01-01'), 52);  // So → KW52 von 2022
  assert.equal(kalenderwoche('2021-01-01'), 53);  // Fr → KW53 von 2020
  assert.equal(kalenderwoche('2022-01-01'), 52);  // Sa → KW52
});

test('wochentag: deckt mehrere Tage ab', () => {
  assert.equal(wochentag('2026-10-12'), 'Mo');
  assert.equal(wochentag('2026-10-14'), 'Mi');
  assert.equal(wochentag('2026-10-18'), 'So');
});

test('wAvg: Durchschnitt variierender Werte', () => {
  // 7 Werte 90..96, Schnitt = 93
  assert.ok(Math.abs(wAvg([90,91,92,93,94,95,96]) - 93) < 1e-9);
});

// ---- lineareTrend ----

test('lineareTrend: perfekt lineare Serie → gibt dieselbe Gerade zurück', () => {
  const r = lineareTrend([10, 12, 14, 16]); // Steigung 2, Achse 10
  assert.ok(Math.abs(r[0] - 10) < 1e-9);
  assert.ok(Math.abs(r[3] - 16) < 1e-9);
});

test('lineareTrend: fallende Serie mit Rauschen → fallende Gerade (Endwert < Startwert)', () => {
  const r = lineareTrend([100, 99, 101, 98, 97, 99, 95]);
  assert.ok(r[r.length - 1] < r[0]);
});

test('lineareTrend: überspringt null-Werte, wertet aber über alle Indizes aus', () => {
  const r = lineareTrend([10, null, 14, null, 18]); // echte Punkte (0,10)(2,14)(4,18) → Steigung 2
  assert.equal(r.length, 5);
  assert.ok(Math.abs(r[1] - 12) < 1e-9); // Gerade an Index 1
  assert.ok(Math.abs(r[3] - 16) < 1e-9);
});

test('lineareTrend: < 2 echte Punkte → Array aus null', () => {
  assert.deepEqual(lineareTrend([5]), [null]);
  assert.deepEqual(lineareTrend([null, 7, null]), [null, null, null]);
});
