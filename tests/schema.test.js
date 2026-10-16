import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_VERSION, KATEGORIEN, EINGABE_KATEGORIEN, PRAEPARATE, istGueltigeKategorie, istEingabeKategorie, istGueltigesPraeparat } from '../app/js/schema.js';

test('SCHEMA_VERSION ist 1', () => {
  assert.equal(SCHEMA_VERSION, 1);
});

test('KATEGORIEN enthält die Spec-Kategorien inkl. sonstiges und (rückwärtskompatibel) sport', () => {
  assert.deepEqual([...KATEGORIEN].sort(),
    ['feiertag_fest', 'krankheit', 'sonstiges', 'sport', 'urlaub', 'wiesn']);
});

test('EINGABE_KATEGORIEN bietet die UI-Kategorien ohne sport, mit sonstiges', () => {
  assert.deepEqual([...EINGABE_KATEGORIEN],
    ['urlaub', 'feiertag_fest', 'krankheit', 'wiesn', 'sonstiges']);
  assert.equal(EINGABE_KATEGORIEN.includes('sport'), false);
});

test('PRAEPARATE enthält MJ/OZ/WG', () => {
  assert.deepEqual([...PRAEPARATE].sort(), ['MJ', 'OZ', 'WG']);
});

test('istGueltigeKategorie erkennt gültig/ungültig', () => {
  assert.equal(istGueltigeKategorie('urlaub'), true);
  assert.equal(istGueltigeKategorie('foo'), false);
});

test('istGueltigeKategorie: sonstiges neu gültig, sport rückwärtskompatibel gültig', () => {
  assert.equal(istGueltigeKategorie('sonstiges'), true);
  assert.equal(istGueltigeKategorie('sport'), true);
});

test('istEingabeKategorie: UI-Kategorien true, Alt-Kategorie sport false', () => {
  assert.equal(istEingabeKategorie('urlaub'), true);
  assert.equal(istEingabeKategorie('sonstiges'), true);
  assert.equal(istEingabeKategorie('sport'), false);
  assert.equal(istEingabeKategorie('foo'), false);
});

test('istGueltigesPraeparat erkennt gültig/ungültig', () => {
  assert.equal(istGueltigesPraeparat('MJ'), true);
  assert.equal(istGueltigesPraeparat('XX'), false);
});

import { istGueltigesDatum, istGueltigerTageseintrag, istGueltigesEreignis } from '../app/js/schema.js';

test('istGueltigesDatum akzeptiert YYYY-MM-DD, lehnt anderes ab', () => {
  assert.equal(istGueltigesDatum('2026-10-14'), true);
  assert.equal(istGueltigesDatum('14.10.2026'), false);
  assert.equal(istGueltigesDatum('2026-13-01'), false);
});

test('istGueltigerTageseintrag: Gewicht Pflicht, Spritze optional', () => {
  assert.equal(istGueltigerTageseintrag({ gewicht_kg: 95.9 }), true);
  assert.equal(istGueltigerTageseintrag({ gewicht_kg: 95.9, spritze: null }), true);
  assert.equal(istGueltigerTageseintrag({}), false);
  assert.equal(istGueltigerTageseintrag({ gewicht_kg: 'x' }), false);
});

test('istGueltigerTageseintrag: Spritze mit ungültigem Präparat ist ungültig', () => {
  assert.equal(istGueltigerTageseintrag({ gewicht_kg: 90, spritze: { praeparat: 'XX' } }), false);
  assert.equal(istGueltigerTageseintrag({ gewicht_kg: 90, spritze: { praeparat: 'MJ', dosis_mg: 12.5, pen_anwendung: 3, historie_rohtext: null } }), true);
});

test('istGueltigesEreignis: von/bis ISO, Kategorie gültig', () => {
  assert.equal(istGueltigesEreignis({ id: 'x', von: '2026-07-10', bis: '2026-07-20', kategorie: 'urlaub', freitext: null }), true);
  assert.equal(istGueltigesEreignis({ id: 'x', von: '2026-07-20', bis: '2026-07-10', kategorie: 'urlaub', freitext: null }), false);
  assert.equal(istGueltigesEreignis({ id: 'x', von: '2026-07-10', bis: '2026-07-20', kategorie: 'foo', freitext: null }), false);
});
