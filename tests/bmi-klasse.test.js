import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmiKlasse } from '../app/js/screens/dashboard.js';

test('WHO-BMI-Klassen inkl. Adipositas-Grade', () => {
  assert.equal(bmiKlasse(17.0), 'Untergewicht');
  assert.equal(bmiKlasse(22.0), 'Normalgewicht');
  assert.equal(bmiKlasse(27.5), 'Übergewicht');
  assert.equal(bmiKlasse(32.0), 'Adipositas Grad I');
  assert.equal(bmiKlasse(37.0), 'Adipositas Grad II');
  assert.equal(bmiKlasse(42.0), 'Adipositas Grad III');
});

test('Grenzwerte liegen jeweils in der oberen Klasse (≥)', () => {
  assert.equal(bmiKlasse(18.5), 'Normalgewicht');
  assert.equal(bmiKlasse(25.0), 'Übergewicht');
  assert.equal(bmiKlasse(30.0), 'Adipositas Grad I');
  assert.equal(bmiKlasse(35.0), 'Adipositas Grad II');
  assert.equal(bmiKlasse(40.0), 'Adipositas Grad III');
});

test('null/fehlend liefert leeren String', () => {
  assert.equal(bmiKlasse(null), '');
  assert.equal(bmiKlasse(undefined), '');
});
