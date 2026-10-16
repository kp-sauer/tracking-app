import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sparklinePunkte } from '../app/js/screens/dashboard.js';

test('leere oder zu kurze Serie liefert leeren Pfad', () => {
  assert.equal(sparklinePunkte([], 300, 100), '');
  assert.equal(sparklinePunkte([90], 300, 100), ''); // ein Punkt = keine Linie
});

test('zwei Punkte: erster links, letzter rechts, min unten / max oben (y invertiert)', () => {
  // Werte 90..100, Breite 300, Höhe 100 (mit kleinem Rand). Erster x=0-ish, letzter x=breite.
  const p = sparklinePunkte([100, 90], 300, 100);
  const paare = p.split(' ').map(s => s.split(',').map(Number));
  assert.equal(paare.length, 2);
  // x: erster ~0, letzter ~300
  assert.ok(paare[0][0] < 1);
  assert.ok(Math.abs(paare[1][0] - 300) < 1);
  // y: 100 ist Max → oben (kleines y), 90 ist Min → unten (großes y)
  assert.ok(paare[0][1] < paare[1][1]);
});

test('konstante Werte landen auf einer horizontalen Mittellinie (kein NaN)', () => {
  const p = sparklinePunkte([80, 80, 80], 300, 100);
  const ys = p.split(' ').map(s => +s.split(',')[1]);
  assert.ok(ys.every(y => Number.isFinite(y)));
  assert.ok(ys.every(y => Math.abs(y - ys[0]) < 1e-9)); // alle gleich
});

test('null-Werte in der Serie werden übersprungen, x folgt dem Original-Index (W-AVG-Lücken)', () => {
  // Index 0..3, Breite 300 → Schritt 100. Werte an Index 1 (x=100) und 3 (x=300).
  const p = sparklinePunkte([null, 90, null, 92], 300, 100);
  const paare = p.split(' ').filter(Boolean).map(s => s.split(',').map(Number));
  assert.equal(paare.length, 2);
  assert.ok(Math.abs(paare[0][0] - 100) < 1); // Index 1
  assert.ok(Math.abs(paare[1][0] - 300) < 1); // Index 3
});
