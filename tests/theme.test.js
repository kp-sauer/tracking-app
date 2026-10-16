import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effektivesTheme } from '../app/js/theme.js';

test('explizit hell/dunkel überschreibt System', () => {
  assert.equal(effektivesTheme('hell', true), 'hell');
  assert.equal(effektivesTheme('dunkel', false), 'dunkel');
});

test('system folgt prefersDark', () => {
  assert.equal(effektivesTheme('system', true), 'dunkel');
  assert.equal(effektivesTheme('system', false), 'hell');
});

test('unbekannt/leer fällt auf system zurück', () => {
  assert.equal(effektivesTheme(undefined, true), 'dunkel');
  assert.equal(effektivesTheme('quatsch', false), 'hell');
});
