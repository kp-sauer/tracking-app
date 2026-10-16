import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effektiveSkala, SKALA_STUFEN } from '../app/js/theme.js';

test('fehlend/leer/ungültig fällt auf 100 zurück', () => {
  assert.equal(effektiveSkala(undefined), 100);
  assert.equal(effektiveSkala(null), 100);
  assert.equal(effektiveSkala(NaN), 100);
  assert.equal(effektiveSkala('quatsch'), 100);
});

test('exakte Stufe bleibt unverändert', () => {
  for (const s of SKALA_STUFEN) assert.equal(effektiveSkala(s), s);
});

test('krummer Wert rastet auf nächste Stufe', () => {
  assert.equal(effektiveSkala(104), 100); // näher an 100 als an 110
  assert.equal(effektiveSkala(106), 110); // näher an 110
  assert.equal(effektiveSkala(115), 110); // 115 ist gleich weit → untere (110) gewinnt per Konvention
});

test('Extremwerte werden auf den erlaubten Bereich geklemmt', () => {
  assert.equal(effektiveSkala(50), 90);
  assert.equal(effektiveSkala(200), 130);
});

test('Zahl als String wird akzeptiert', () => {
  assert.equal(effektiveSkala('110'), 110);
});
