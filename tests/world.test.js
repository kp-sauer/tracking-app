import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weltAusPfad } from '../app/js/world.js';

test('Pfad mit /test/ ergibt "test"', () => {
  assert.equal(weltAusPfad('/tracking-app/test/'), 'test');
  assert.equal(weltAusPfad('/tracking-app/test/index.html'), 'test');
});

test('Produktiv-Root ergibt "produktiv"', () => {
  assert.equal(weltAusPfad('/tracking-app/'), 'produktiv');
  assert.equal(weltAusPfad('/tracking-app/index.html'), 'produktiv');
});

test('Nachgestelltes /test ohne Slash zählt NICHT als Test-Welt', () => {
  assert.equal(weltAusPfad('/tracking-app/greatest/'), 'produktiv');
});
