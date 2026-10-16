import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zielInKg, zielInBmi, DEFAULT_ZIEL } from '../app/js/calc.js';

const G = 1.75; // Körpergröße

test('Ziel vom Typ kg: kg bleibt, BMI wird abgeleitet', () => {
  const ziel = { typ: 'kg', wert: 76.6 };
  assert.ok(Math.abs(zielInKg(ziel, G) - 76.6) < 1e-9);
  assert.ok(Math.abs(zielInBmi(ziel, G) - 76.6 / (G * G)) < 1e-9);
});

test('Ziel vom Typ bmi: kg wird aus Größe abgeleitet, BMI bleibt', () => {
  const ziel = { typ: 'bmi', wert: 25 };
  assert.ok(Math.abs(zielInKg(ziel, G) - 25 * G * G) < 1e-9); // 76.5625
  assert.ok(Math.abs(zielInBmi(ziel, G) - 25) < 1e-9);
});

test('BMI-Ziel bleibt bei Größenänderung konstant (kg passt sich an)', () => {
  const ziel = { typ: 'bmi', wert: 25 };
  const kg175 = zielInKg(ziel, 1.75);
  const kg178 = zielInKg(ziel, 1.78);
  assert.ok(kg178 > kg175);                       // größer → mehr kg für selben BMI
  assert.ok(Math.abs(zielInBmi(ziel, 1.78) - 25) < 1e-9); // BMI bleibt 25
});

test('fehlendes/ungültiges Ziel fällt auf DEFAULT_ZIEL (BMI 25) zurück', () => {
  assert.ok(Math.abs(zielInKg(null, G) - 25 * G * G) < 1e-9);
  assert.ok(Math.abs(zielInKg(undefined, G) - 25 * G * G) < 1e-9);
  assert.ok(Math.abs(zielInBmi({ typ: 'quatsch', wert: 5 }, G) - 25) < 1e-9);
  assert.equal(DEFAULT_ZIEL.typ, 'bmi');
  assert.equal(DEFAULT_ZIEL.wert, 25);
});
