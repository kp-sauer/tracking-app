import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istStrukturierteSpritze, setzeSpritze, entferneSpritze } from '../app/js/spritze.js';

const strukturiert = Object.freeze({ praeparat: 'MJ', dosis_mg: 12.5, pen_anwendung: 3, historie_rohtext: null });
const rohtext = Object.freeze({ praeparat: 'OZ', dosis_mg: null, pen_anwendung: null, historie_rohtext: 'OZ 10/2' });

test('istStrukturierteSpritze: nur mit dosis_mg', () => {
  assert.equal(istStrukturierteSpritze(strukturiert), true);
  assert.equal(istStrukturierteSpritze(rohtext), false);
  assert.equal(istStrukturierteSpritze(null), false);
  assert.equal(istStrukturierteSpritze(undefined), false);
  // dosis_mg: 0 gilt als strukturiert (0 != null); praktisch unerreichbar (kleinste Dosis 0.25 mg).
  assert.equal(istStrukturierteSpritze({ praeparat: 'MJ', dosis_mg: 0 }), true);
});

test('setzeSpritze ersetzt Spritze, lässt gewicht_kg unberührt', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: null }, '2026-07-02': { gewicht_kg: 90.1, spritze: null } };
  const neu = setzeSpritze(vorher, '2026-07-01', strukturiert);
  assert.deepEqual(neu['2026-07-01'], { gewicht_kg: 90.3, spritze: strukturiert });
  assert.equal(neu['2026-07-02'], vorher['2026-07-02']);
  assert.equal(vorher['2026-07-01'].spritze, null);
});

test('setzeSpritze: unbekannter Tag → unveränderte (neue) Map, kein neuer Tag', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: null } };
  const neu = setzeSpritze(vorher, '2026-07-09', strukturiert);
  assert.deepEqual(neu, vorher);
  assert.equal(neu['2026-07-09'], undefined);
  assert.notEqual(neu, vorher);
});

test('entferneSpritze setzt spritze=null, gewicht bleibt', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: strukturiert } };
  const neu = entferneSpritze(vorher, '2026-07-01');
  assert.deepEqual(neu['2026-07-01'], { gewicht_kg: 90.3, spritze: null });
  assert.equal(vorher['2026-07-01'].spritze, strukturiert);
});

test('entferneSpritze: unbekannter Tag → unveränderte (neue) Map', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: strukturiert } };
  const neu = entferneSpritze(vorher, '2026-07-09');
  assert.deepEqual(neu, vorher);
  assert.notEqual(neu, vorher);
});
