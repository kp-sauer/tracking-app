import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardModell } from '../app/js/kpi.js';

const daten = {
  profil: { koerpergroesse_m: 1.75 },
  tageseintraege: {
    '2026-01-02': { gewicht_kg: 100.0, spritze: null },
    '2026-10-14': { gewicht_kg: 95.9, spritze: null },
    '2026-05-01': { gewicht_kg: 90.0, spritze: null },
  },
  ereignisse: [],
};

test('dashboardModell: aktuelles = jüngstes Datum', () => {
  const m = dashboardModell(daten);
  assert.equal(m.aktuellesGewicht, 95.9);
  assert.equal(m.startGewichtJahr, 100.0);
});

test('dashboardModell: BMI, Diff, Gesamtverlust', () => {
  const m = dashboardModell(daten);
  assert.ok(Math.abs(m.bmi - 31.31) < 0.01);
  assert.ok(Math.abs(m.diffZumStart - 4.1) < 1e-6);
  // Ältester Eintrag = 2026-01-02 mit 100.0; aktuell = 95.9 → Gesamtverlust = 4.1
  assert.ok(Math.abs(m.gesamtverlust - 4.1) < 1e-6);
});

test('dashboardModell: Max/Min mit Datum', () => {
  const m = dashboardModell(daten);
  assert.equal(m.max.gewicht_kg, 100.0);
  assert.equal(m.max.datum, '2026-01-02');
  assert.equal(m.min.gewicht_kg, 90.0);
  assert.equal(m.min.datum, '2026-05-01');
});

test('dashboardModell: Zielgewichte BMI 30/25', () => {
  const m = dashboardModell(daten);
  assert.ok(Math.abs(m.ziel30 - 91.875) < 1e-6);
  assert.ok(Math.abs(m.ziel25 - 76.5625) < 1e-6);
});

test('dashboardModell: leerer Bestand → null-Felder, kein Absturz', () => {
  const m = dashboardModell({ profil: { koerpergroesse_m: 1.75 }, tageseintraege: {}, ereignisse: [] });
  assert.equal(m.aktuellesGewicht, null);
});

test('dashboardModell: Gesamt-Start wird aus dem ältesten Tageseintrag abgeleitet (nicht hartkodiert)', () => {
  const daten = { profil: { koerpergroesse_m: 1.75 }, tageseintraege: {
    '2023-02-22': { gewicht_kg: 116.5, spritze: null },
    '2026-10-14': { gewicht_kg: 95.9, spritze: null },
  }, ereignisse: [] };
  const m = dashboardModell(daten, { modus: 'gesamt' });
  assert.ok(Math.abs(m.zielStart - 116.5) < 1e-9);            // ältester Eintrag
  assert.ok(Math.abs(m.gesamtverlust - 20.6) < 1e-6);         // 116.5 - 95.9
  assert.ok(m.verlustTitel.includes('22.02.2023'));           // Datum dynamisch aus ältestem Eintrag
});
