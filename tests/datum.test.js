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

import { achsenGranularitaet, formatAchse, monatsTicksSek, jahresTicksSek, monatsLabelSichtbar } from '../app/js/datum.js';

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

test('formatAchse monat: nur Monatswort (Jahr kommt ueber Chart-Zweitzeile)', () => {
  assert.equal(formatAchse(sek('2026-07-01'), 'monat', 'num'), 'Jul');
  assert.equal(formatAchse(sek('2026-01-01'), 'monat', 'num'), 'Jan');
});

test('formatAchse jahr: vierstellig', () => {
  assert.equal(formatAchse(sek('2026-05-01'), 'jahr', 'num'), '2026');
});

test('monatsTicksSek: mehrere Monate in einem Jahr -> je Monatserster', () => {
  assert.deepEqual(
    monatsTicksSek(sek('2026-09-15'), sek('2026-12-10')),
    [sek('2026-09-01'), sek('2026-10-01'), sek('2026-11-01'), sek('2026-12-01')]
  );
});

test('monatsTicksSek: Jahreswechsel wird korrekt ueberschritten', () => {
  assert.deepEqual(
    monatsTicksSek(sek('2025-12-05'), sek('2026-02-20')),
    [sek('2025-12-01'), sek('2026-01-01'), sek('2026-02-01')]
  );
});

test('monatsTicksSek: minSek > maxSek -> leer', () => {
  assert.deepEqual(monatsTicksSek(sek('2026-05-01'), sek('2026-03-01')), []);
});

test('monatsTicksSek: minSek === maxSek auf Monatserstem -> genau ein Tick', () => {
  assert.deepEqual(
    monatsTicksSek(sek('2026-07-01'), sek('2026-07-01')),
    [sek('2026-07-01')]
  );
});

test('monatsTicksSek: ungueltige (nicht-endliche) Eingabe -> leer', () => {
  assert.deepEqual(monatsTicksSek(NaN, sek('2026-05-01')), []);
  assert.deepEqual(monatsTicksSek(sek('2026-05-01'), Infinity), []);
});

test('monatsTicksSek: jeder Tick ist zeitzonenfrei der 1. um 00:00 UTC', () => {
  for (const tick of monatsTicksSek(sek('2025-11-10'), sek('2026-04-05'))) {
    const d = new Date(tick * 1000);
    assert.equal(d.getUTCDate(), 1);
    assert.equal(d.getUTCHours(), 0);
  }
});

test('jahresTicksSek: Mehr-Jahres-Spanne -> je Jahreserster', () => {
  assert.deepEqual(
    jahresTicksSek(sek('2023-02-22'), sek('2026-10-16')),
    [sek('2023-01-01'), sek('2024-01-01'), sek('2025-01-01'), sek('2026-01-01')]
  );
});

test('jahresTicksSek: minSek > maxSek -> leer', () => {
  assert.deepEqual(jahresTicksSek(sek('2026-01-01'), sek('2023-01-01')), []);
});

test('jahresTicksSek: minSek === maxSek auf Jahresanfang -> genau ein Tick', () => {
  assert.deepEqual(
    jahresTicksSek(sek('2025-01-01'), sek('2025-01-01')),
    [sek('2025-01-01')]
  );
});

test('jahresTicksSek: ungueltige (nicht-endliche) Eingabe -> leer', () => {
  assert.deepEqual(jahresTicksSek(NaN, sek('2026-01-01')), []);
  assert.deepEqual(jahresTicksSek(sek('2023-01-01'), Infinity), []);
});

test('jahresTicksSek: jeder Tick ist zeitzonenfrei der 1. Januar um 00:00 UTC', () => {
  for (const tick of jahresTicksSek(sek('2022-06-15'), sek('2025-03-05'))) {
    const d = new Date(tick * 1000);
    assert.equal(d.getUTCMonth(), 0);
    assert.equal(d.getUTCDate(), 1);
    assert.equal(d.getUTCHours(), 0);
  }
});

test('monatsLabelSichtbar: <=12 Ticks -> alle sichtbar', () => {
  for (let i = 0; i < 12; i++) assert.equal(monatsLabelSichtbar(i, 12), true);
});

test('monatsLabelSichtbar: 18 Ticks -> jeder zweite ab Index 0', () => {
  const sichtbar = Array.from({ length: 18 }, (_, i) => monatsLabelSichtbar(i, 18));
  assert.deepEqual(
    sichtbar,
    [true, false, true, false, true, false, true, false, true,
     false, true, false, true, false, true, false, true, false]
  );
});

test('monatsLabelSichtbar: Grenzfall genau 12 -> alle, genau 13 -> ausgeduennt', () => {
  for (let i = 0; i < 12; i++) assert.equal(monatsLabelSichtbar(i, 12), true);
  assert.equal(monatsLabelSichtbar(0, 13), true);
  assert.equal(monatsLabelSichtbar(1, 13), false);
  assert.equal(monatsLabelSichtbar(2, 13), true);
});
