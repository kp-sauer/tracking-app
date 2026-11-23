import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tooltipChips } from '../app/js/tooltip-chips.js';

const EV = [
  { id: 'a', von: '2026-10-10', bis: '2026-10-20', kategorie: 'urlaub', freitext: null },
  { id: 'b', von: '2026-10-31', bis: '2026-10-31', kategorie: 'wiesn', freitext: null },
];

test('Tag ohne Ereignis/Medikament -> leer', () => {
  assert.deepEqual(tooltipChips([], null, '2026-01-01'), []);
});

test('mehrtaegiges Ereignis erscheint am mittleren Tag', () => {
  const chips = tooltipChips(EV, null, '2026-10-15');
  assert.equal(chips.length, 1);
  assert.deepEqual(chips[0], { typ: 'ev', label: 'Urlaub' });
});

test('eintaegiges Ereignis am Starttag', () => {
  const chips = tooltipChips(EV, null, '2026-10-31');
  assert.ok(chips.some(c => c.typ === 'ev' && c.label === 'Wiesn'));
});

test('strukturierte Spritze -> Praeparat + Dosis mit Komma', () => {
  const sp = { praeparat: 'MJ', dosis_mg: 12.5, anwendung: 3 };
  const chips = tooltipChips([], sp, '2026-10-31');
  assert.deepEqual(chips, [{ typ: 'med', label: 'MJ 12,5 mg' }]);
});

test('Rohtext-Spritze -> unveraenderter Text', () => {
  const sp = { praeparat: 'OZ', dosis_mg: null, historie_rohtext: 'OZ 10/2' };
  const chips = tooltipChips([], sp, '2026-10-31');
  assert.deepEqual(chips, [{ typ: 'med', label: 'OZ 10/2' }]);
});

test('Ereignis + Medikament am selben Tag -> zwei Chips (med zuerst)', () => {
  const sp = { praeparat: 'MJ', dosis_mg: 10, anwendung: 1 };
  const chips = tooltipChips(EV, sp, '2026-10-31');
  assert.equal(chips.length, 2);
  assert.equal(chips[0].typ, 'med');
  assert.equal(chips[1].typ, 'ev');
});

test('unbekannte Kategorie -> Fallback-Label', () => {
  const chips = tooltipChips([{ id: 'x', von: '2026-10-31', bis: '2026-10-31', kategorie: 'sport' }], null, '2026-10-31');
  assert.deepEqual(chips, [{ typ: 'ev', label: 'Ereignis' }]);
});
