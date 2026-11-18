import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fruehesTheme } from '../app/js/theme.js';

test('explizite Wahl hell/dunkel gewinnt über System', () => {
  assert.equal(fruehesTheme('hell', true), 'hell');
  assert.equal(fruehesTheme('dunkel', false), 'dunkel');
});

test("'system' folgt prefersDark", () => {
  assert.equal(fruehesTheme('system', true), 'dunkel');
  assert.equal(fruehesTheme('system', false), 'hell');
});

test('fehlend/leer/unbekannt → System-Fallback', () => {
  assert.equal(fruehesTheme(null, true), 'dunkel');
  assert.equal(fruehesTheme(undefined, false), 'hell');
  assert.equal(fruehesTheme('', true), 'dunkel');
  assert.equal(fruehesTheme('quatsch', false), 'hell');
});
