import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoZuTeilen, teileZuIso, tageImMonat, formatiereDatum } from '../app/js/felder.js';

test('isoZuTeilen zerlegt gültiges ISO-Datum', () => {
  assert.deepEqual(isoZuTeilen('1980-06-15'), { tag: 15, monat: 6, jahr: 1980 });
});
test('isoZuTeilen bei leer/ungültig -> Default', () => {
  assert.deepEqual(isoZuTeilen(''), { tag: 1, monat: 1, jahr: 1990 });
  assert.deepEqual(isoZuTeilen('quatsch'), { tag: 1, monat: 1, jahr: 1990 });
});
test('teileZuIso baut nullgepolstertes ISO', () => {
  assert.equal(teileZuIso(5, 3, 2001), '2001-03-05');
  assert.equal(teileZuIso(15, 6, 1980), '1980-06-15');
});
test('teileZuIso begrenzt Tag auf Monatslänge (31. Februar -> 28./29.)', () => {
  assert.equal(teileZuIso(31, 2, 2021), '2021-02-28'); // kein Schaltjahr
  assert.equal(teileZuIso(31, 2, 2020), '2020-02-29'); // Schaltjahr
  assert.equal(teileZuIso(31, 4, 2021), '2021-04-30'); // April hat 30
});
test('tageImMonat inkl. Schaltjahr', () => {
  assert.equal(tageImMonat(2, 2020), 29);
  assert.equal(tageImMonat(2, 2021), 28);
  assert.equal(tageImMonat(4, 2021), 30);
  assert.equal(tageImMonat(1, 2021), 31);
});
test('formatiereDatum liefert lesbaren String', () => {
  assert.equal(formatiereDatum('1980-06-15'), '15. Juni 1980');
});
