import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imZeitfenster } from '../app/js/db.js';

// Hilfsdaten: sortierte Tagesliste über Jahreswechsel 2024→2026.
const tage = [
  { datum: '2024-12-30', gewicht_kg: 100 },
  { datum: '2024-12-31', gewicht_kg: 99 },
  { datum: '2025-06-15', gewicht_kg: 95 },
  { datum: '2026-01-01', gewicht_kg: 93 },
  { datum: '2026-10-10', gewicht_kg: 91 },
  { datum: '2026-10-15', gewicht_kg: 90 },
];

test('gesamt gibt alle Tage unverändert zurück', () => {
  assert.deepEqual(imZeitfenster(tage, { modus: 'gesamt' }), tage);
});

test('jahr filtert exakt auf das Kalenderjahr (Jahreswechsel-Grenzen)', () => {
  const r2026 = imZeitfenster(tage, { modus: 'jahr', jahr: 2026 });
  assert.deepEqual(r2026.map(t => t.datum), ['2026-01-01', '2026-10-10', '2026-10-15']);
  const r2024 = imZeitfenster(tage, { modus: 'jahr', jahr: 2024 });
  assert.deepEqual(r2024.map(t => t.datum), ['2024-12-30', '2024-12-31']);
});

test('jahr ohne Treffer gibt leeres Fenster', () => {
  assert.deepEqual(imZeitfenster(tage, { modus: 'jahr', jahr: 2023 }), []);
});

test('tage nimmt die letzten N Kalendertage relativ zum LETZTEN Eintrag', () => {
  // letzter Eintrag 2026-10-15; N=6 → Grenze 2026-10-10 (einschließlich)
  const r = imZeitfenster(tage, { modus: 'tage', tage: 6 });
  assert.deepEqual(r.map(t => t.datum), ['2026-10-10', '2026-10-15']);
});

test('tage Randfall: N trifft Grenze exakt', () => {
  // letzter 2026-10-15, N=1 → nur der letzte Tag
  const r = imZeitfenster(tage, { modus: 'tage', tage: 1 });
  assert.deepEqual(r.map(t => t.datum), ['2026-10-15']);
});

test('tage mit sehr großem N gibt alle Tage', () => {
  const r = imZeitfenster(tage, { modus: 'tage', tage: 3650 });
  assert.deepEqual(r.map(t => t.datum), tage.map(t => t.datum));
});

test('leere Eingabe ist robust', () => {
  assert.deepEqual(imZeitfenster([], { modus: 'gesamt' }), []);
  assert.deepEqual(imZeitfenster([], { modus: 'tage', tage: 90 }), []);
  assert.deepEqual(imZeitfenster([], { modus: 'jahr', jahr: 2026 }), []);
});

test('unbekannter/fehlender Modus fällt auf gesamt zurück', () => {
  assert.deepEqual(imZeitfenster(tage, {}), tage);
  assert.deepEqual(imZeitfenster(tage, { modus: 'quatsch' }), tage);
});
