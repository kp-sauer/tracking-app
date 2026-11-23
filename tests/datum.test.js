import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLang, formatKurz,
  DATUM_LANG_DEFAULT, DATUM_KURZ_DEFAULT, WOCHENTAGE_KURZ,
} from '../app/js/datum.js';

test('Defaults sind lang=wort, kurz=num', () => {
  assert.equal(DATUM_LANG_DEFAULT, 'wort');
  assert.equal(DATUM_KURZ_DEFAULT, 'num');
});

test('formatLang: wort', () => {
  assert.equal(formatLang('2026-10-31', 'wort'), '31. Okt. 2026');
  assert.equal(formatLang('1980-06-05', 'wort'), '5. Juni 1980');
});

test('formatLang: num', () => {
  assert.equal(formatLang('2026-10-31', 'num'), '31.10.2026');
  assert.equal(formatLang('1980-06-05', 'num'), '05.06.1980');
});

test('formatLang: wochentag (31.10.2026 = Samstag)', () => {
  assert.equal(formatLang('2026-10-31', 'wochentag'), 'Sa, 31.10.2026');
});

test('formatLang: unbekanntes Format faellt auf wort zurueck', () => {
  assert.equal(formatLang('2026-10-31', 'quatsch'), '31. Okt. 2026');
});

test('formatKurz: num ohne Jahr', () => {
  assert.equal(formatKurz('2026-10-31', 'num'), '31.10.');
  assert.equal(formatKurz('2026-01-05', 'num'), '5.1.');
});

test('formatKurz: wort', () => {
  assert.equal(formatKurz('2026-10-31', 'wort'), '31. Okt');
});

test('WOCHENTAGE_KURZ hat 7 Eintraege beginnend mit So', () => {
  assert.equal(WOCHENTAGE_KURZ.length, 7);
  assert.equal(WOCHENTAGE_KURZ[0], 'So');
});

test('formatLang ist zeitzonenfrei (kein new Date(iso)-Versatz)', () => {
  assert.equal(formatLang('2026-01-01', 'num'), '01.01.2026');
});

import { achsenGranularitaet, formatAchse } from '../app/js/datum.js';

const TAG = 86400;              // Sekunden pro Tag
const sek = (iso) => Date.UTC(...iso.split('-').map((v,i)=>i===1?+v-1:+v)) / 1000;

test('achsenGranularitaet: kurze Spanne -> tag', () => {
  assert.equal(achsenGranularitaet(30 * TAG), 'tag');
  assert.equal(achsenGranularitaet(45 * TAG), 'tag');
});

test('achsenGranularitaet: mittlere Spanne -> monat', () => {
  assert.equal(achsenGranularitaet(120 * TAG), 'monat');
  assert.equal(achsenGranularitaet(400 * TAG), 'monat');
});

test('achsenGranularitaet: grosse Spanne -> jahr', () => {
  assert.equal(achsenGranularitaet(600 * TAG), 'jahr');
  assert.equal(achsenGranularitaet(1200 * TAG), 'jahr');
});

test('formatAchse tag: nutzt Kurz-Format', () => {
  assert.equal(formatAchse(sek('2026-10-31'), 'tag', 'num'), '31.10.');
  assert.equal(formatAchse(sek('2026-10-31'), 'tag', 'wort'), '31. Okt');
});

test('formatAchse monat: Monatswort, Jahr nur bei Januar', () => {
  assert.equal(formatAchse(sek('2026-07-01'), 'monat', 'num'), 'Jul');
  assert.equal(formatAchse(sek('2026-01-01'), 'monat', 'num'), 'Jan 26');
});

test('formatAchse jahr: vierstellig', () => {
  assert.equal(formatAchse(sek('2026-05-01'), 'jahr', 'num'), '2026');
});
