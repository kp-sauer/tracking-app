import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strategieFuer } from '../app/js/sw-strategie.js';

test('vendor/-Dateien bekommen cache-first', () => {
  assert.equal(strategieFuer('/vendor/uPlot.iife.min.js'), 'vendor');
  assert.equal(strategieFuer('/vendor/uPlot.min.css'), 'vendor');
});

test('App-Dateien bekommen network-first', () => {
  assert.equal(strategieFuer('/css/app.css'), 'app');
  assert.equal(strategieFuer('/js/main.js'), 'app');
  assert.equal(strategieFuer('/index.html'), 'app');
  assert.equal(strategieFuer('/'), 'app');
});

test('"vendor" nur als Teilstring (kein /vendor/-Verzeichnis) zählt als App', () => {
  assert.equal(strategieFuer('/js/vendor-helper.js'), 'app');
  assert.equal(strategieFuer('/vendors/x.js'), 'app');
  assert.equal(strategieFuer('/css/vendor.css'), 'app');
});

test('vendor/ auch in Unterverzeichnis-Pfaden', () => {
  assert.equal(strategieFuer('/app/vendor/lib.js'), 'vendor');
});
