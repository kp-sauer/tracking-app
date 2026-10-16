import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartSerien } from '../app/js/screens/charts.js';

// chartSerien bekommt die bereits sortierte, w_avg-angereicherte Tagesliste
// (so wie renderCharts sie via wAvgSerie(imZeitfenster(...)) erzeugt).
test('chartSerien liefert x (Zeitstempel) + Gewicht + W-AVG + Trend', () => {
  const tage = [
    { datum: '2026-01-01', gewicht_kg: 100, w_avg: 100 },
    { datum: '2026-01-02', gewicht_kg: 99, w_avg: 99.5 },
  ];
  const s = chartSerien(tage);
  assert.equal(s.x.length, 2);
  assert.equal(s.gewicht[0], 100);
  assert.equal(s.gewicht[1], 99);
  assert.equal(s.wavg.length, 2);
  assert.equal(s.wavg[0], 100);
  // Trend: lineare Gerade über zwei Punkte = exakt die Werte.
  assert.equal(s.trend.length, 2);
  assert.ok(Math.abs(s.trend[0] - 100) < 1e-9);
  assert.ok(Math.abs(s.trend[1] - 99) < 1e-9);
});

test('chartSerien: x sind UTC-Sekunden, aufsteigend', () => {
  const tage = [
    { datum: '2026-01-01', gewicht_kg: 100, w_avg: 100 },
    { datum: '2026-01-02', gewicht_kg: 99, w_avg: 99.5 },
  ];
  const s = chartSerien(tage);
  assert.equal(s.x[0], Date.parse('2026-01-01T00:00:00Z') / 1000);
  assert.ok(s.x[1] > s.x[0]);
});
