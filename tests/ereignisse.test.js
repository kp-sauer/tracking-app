import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ereignisseAmTag, neuesEreignis, setzeTagesereignis, ereignislageAmTag, entferneEreignis, aktualisiereEreignis } from '../app/js/ereignisse.js';

const liste = [
  { id: 'a', von: '2026-07-10', bis: '2026-07-20', kategorie: 'urlaub', freitext: null },
  { id: 'b', von: '2026-09-01', bis: '2026-09-01', kategorie: 'sport', freitext: 'Lauf' },
];

test('ereignisseAmTag: Tag im Zeitraum trifft', () => {
  assert.deepEqual(ereignisseAmTag(liste, '2026-07-15').map(e => e.id), ['a']);
  assert.deepEqual(ereignisseAmTag(liste, '2026-07-10').map(e => e.id), ['a']);
  assert.deepEqual(ereignisseAmTag(liste, '2026-07-20').map(e => e.id), ['a']);
});

test('ereignisseAmTag: Tag außerhalb trifft nicht', () => {
  assert.deepEqual(ereignisseAmTag(liste, '2026-07-21'), []);
});

test('neuesEreignis erzeugt gültiges Objekt mit id', () => {
  const e = neuesEreignis('2026-12-24', '2026-12-26', 'feiertag_fest', 'Weihnachten');
  assert.equal(typeof e.id, 'string');
  assert.ok(e.id.length > 0);
  assert.equal(e.von, '2026-12-24');
  assert.equal(e.kategorie, 'feiertag_fest');
});

// ---- setzeTagesereignis ----

test('setzeTagesereignis: kein Alt-Ereignis am Tag → neues wird angehängt', () => {
  const ev = { id: 'x', von: '2026-10-15', bis: '2026-10-15', kategorie: 'urlaub', freitext: null };
  const next = setzeTagesereignis(liste, '2026-10-15', ev);
  assert.deepEqual(next.map(e => e.id), ['a', 'b', 'x']);
});

test('setzeTagesereignis: Alt-Ereignis mit von===datum wird ersetzt (keine Dublette)', () => {
  const alt = [{ id: 'alt', von: '2026-10-15', bis: '2026-10-15', kategorie: 'urlaub', freitext: null }];
  const neu = { id: 'neu', von: '2026-10-15', bis: '2026-10-15', kategorie: 'krankheit', freitext: null };
  const next = setzeTagesereignis(alt, '2026-10-15', neu);
  assert.deepEqual(next.map(e => e.id), ['neu']);
  assert.equal(next[0].kategorie, 'krankheit');
});

test('setzeTagesereignis: mehrtägiges Ereignis mit von<datum (nur Überlappung) bleibt erhalten', () => {
  const next = setzeTagesereignis(liste, '2026-07-15', null);
  // 'a' startet am 10., überlappt den 15. nur → bleibt. 'b' unberührt.
  assert.deepEqual(next.map(e => e.id), ['a', 'b']);
});

test('setzeTagesereignis: neuesEv===null entfernt nur das am Tag startende Ereignis', () => {
  const alt = [
    { id: 'a', von: '2026-07-10', bis: '2026-07-20', kategorie: 'urlaub', freitext: null },
    { id: 'tag', von: '2026-10-15', bis: '2026-10-15', kategorie: 'wiesn', freitext: null },
  ];
  const next = setzeTagesereignis(alt, '2026-10-15', null);
  assert.deepEqual(next.map(e => e.id), ['a']);
});

// ---- ereignislageAmTag ----

const wiesn = [{ id: 'w', von: '2026-10-15', bis: '2026-10-16', kategorie: 'wiesn', freitext: null }];

test('ereignislageAmTag: Starttag → art "start"', () => {
  const lage = ereignislageAmTag(wiesn, '2026-10-15');
  assert.equal(lage.art, 'start');
  assert.equal(lage.ereignis.id, 'w');
});

test('ereignislageAmTag: reiner Überlappungstag → art "laeuft"', () => {
  const lage = ereignislageAmTag(wiesn, '2026-10-16');
  assert.equal(lage.art, 'laeuft');
  assert.equal(lage.ereignis.id, 'w');
});

test('ereignislageAmTag: kein Ereignis am Tag → art "keins"', () => {
  const lage = ereignislageAmTag(wiesn, '2026-10-17');
  assert.equal(lage.art, 'keins');
  assert.equal(lage.ereignis, null);
});

test('ereignislageAmTag: Starttag gewinnt vor überlappendem mehrtägigem Ereignis', () => {
  const beide = [
    { id: 'lang', von: '2026-10-10', bis: '2026-10-20', kategorie: 'urlaub', freitext: null },
    { id: 'tag', von: '2026-10-15', bis: '2026-10-15', kategorie: 'krankheit', freitext: null },
  ];
  const lage = ereignislageAmTag(beide, '2026-10-15');
  assert.equal(lage.art, 'start');
  assert.equal(lage.ereignis.id, 'tag');
});

// ---- entferneEreignis ----

test('entferneEreignis: entfernt das Ereignis mit passender id', () => {
  const next = entferneEreignis(liste, 'a');
  assert.deepEqual(next.map(e => e.id), ['b']);
});

test('entferneEreignis: unbekannte id lässt Liste unverändert (inhaltlich)', () => {
  const next = entferneEreignis(liste, 'gibtsnicht');
  assert.deepEqual(next.map(e => e.id), ['a', 'b']);
});

test('entferneEreignis: ist immutabel (Eingabe-Array unverändert)', () => {
  const vorher = liste.map(e => e.id);
  entferneEreignis(liste, 'a');
  assert.deepEqual(liste.map(e => e.id), vorher);
});

// ---- aktualisiereEreignis ----

test('aktualisiereEreignis: ersetzt Felder des Ereignisses mit passender id', () => {
  const next = aktualisiereEreignis(liste, 'a', {
    kategorie: 'krankheit', von: '2026-07-11', bis: '2026-07-19', freitext: 'grippe',
  });
  const a = next.find(e => e.id === 'a');
  assert.equal(a.kategorie, 'krankheit');
  assert.equal(a.von, '2026-07-11');
  assert.equal(a.bis, '2026-07-19');
  assert.equal(a.freitext, 'grippe');
  assert.equal(next.find(e => e.id === 'b').kategorie, 'sport');
});

test('aktualisiereEreignis: tauscht Von/Bis, wenn bis < von', () => {
  const next = aktualisiereEreignis(liste, 'a', {
    kategorie: 'urlaub', von: '2026-07-20', bis: '2026-07-10', freitext: null,
  });
  const a = next.find(e => e.id === 'a');
  assert.equal(a.von, '2026-07-10');
  assert.equal(a.bis, '2026-07-20');
});

test('aktualisiereEreignis: unbekannte id lässt Liste inhaltlich unverändert', () => {
  const next = aktualisiereEreignis(liste, 'gibtsnicht', {
    kategorie: 'wiesn', von: '2026-01-01', bis: '2026-01-01', freitext: null,
  });
  assert.deepEqual(next.map(e => e.kategorie), ['urlaub', 'sport']);
});

test('aktualisiereEreignis: ist immutabel (Eingabe-Objekt unverändert)', () => {
  aktualisiereEreignis(liste, 'a', { kategorie: 'wiesn', von: '2026-07-10', bis: '2026-07-20', freitext: null });
  assert.equal(liste.find(e => e.id === 'a').kategorie, 'urlaub');
});

