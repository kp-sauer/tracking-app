import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS, routeAusHash, STANDARD_SCREEN, datumAusHash } from '../app/js/router.js';

test('SCREENS enthält die 5 Screens + onboarding', () => {
  assert.deepEqual([...SCREENS].sort(),
    ['charts', 'dashboard', 'eingabe', 'onboarding', 'profil', 'verlauf']);
});

test('routeAusHash parst bekannte Screens', () => {
  assert.equal(routeAusHash('#/dashboard'), 'dashboard');
  assert.equal(routeAusHash('#/charts'), 'charts');
});

test('leerer/unbekannter Hash → STANDARD_SCREEN', () => {
  assert.equal(routeAusHash(''), STANDARD_SCREEN);
  assert.equal(routeAusHash('#/'), STANDARD_SCREEN);
  assert.equal(routeAusHash('#/gibtsnicht'), STANDARD_SCREEN);
});

test('routeAusHash ignoriert den Query-Teil bei der Screen-Bestimmung', () => {
  assert.equal(routeAusHash('#/eingabe?datum=2026-10-15'), 'eingabe');
  assert.equal(routeAusHash('#/verlauf?foo=bar'), 'verlauf');
});

test('datumAusHash parst ein gültig geformtes Datum', () => {
  assert.equal(datumAusHash('#/eingabe?datum=2026-10-15'), '2026-10-15');
  assert.equal(datumAusHash('#/eingabe?a=1&datum=2026-01-02'), '2026-01-02');
});

test('datumAusHash → null bei fehlendem/ungültig geformtem Datum', () => {
  assert.equal(datumAusHash('#/eingabe'), null);
  assert.equal(datumAusHash('#/eingabe?datum='), null);
  assert.equal(datumAusHash('#/eingabe?datum=quatsch'), null);
  assert.equal(datumAusHash(''), null);
});
