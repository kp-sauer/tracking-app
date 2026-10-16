import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboardModell } from '../app/js/kpi.js';

// Daten über zwei Jahre, damit der Jahr-Filter etwas zu filtern hat.
// Ältester Eintrag = 2025-03-01 mit 105.0 kg → wird als Projekt-Gesamtstart verwendet.
const daten = {
  profil: { koerpergroesse_m: 1.75 },
  tageseintraege: {
    '2025-03-01': { gewicht_kg: 105.0 },
    '2025-12-20': { gewicht_kg: 98.0 },
    '2026-01-10': { gewicht_kg: 96.0 },
    '2026-06-01': { gewicht_kg: 92.0 },
    '2026-10-15': { gewicht_kg: 90.0 },
  },
  ereignisse: [],
};

test('Filter jahr 2026: aktuelles/max/min nur aus 2026', () => {
  const m = dashboardModell(daten, { modus: 'jahr', jahr: 2026 });
  assert.equal(m.aktuellesGewicht, 90.0);          // letzter 2026er
  assert.equal(m.max.gewicht_kg, 96.0);            // höchster in 2026
  assert.equal(m.max.datum, '2026-01-10');
  assert.equal(m.min.gewicht_kg, 90.0);            // niedrigster in 2026
  assert.equal(m.min.datum, '2026-10-15');
});

test('Filter jahr 2026: Verlust = erster − letzter IM Fenster (nicht ab Gesamtstart)', () => {
  const m = dashboardModell(daten, { modus: 'jahr', jahr: 2026 });
  // erster 2026 = 96.0, letzter = 90.0 → 6.0 im Fenster verloren
  assert.ok(Math.abs(m.verlust - 6.0) < 1e-6);
  assert.ok(/2026/.test(m.verlustTitel));          // Titel nennt das Jahr
});

test('Filter jahr 2026: Weg-zum-Ziel-Start = erster Wert im Fenster', () => {
  const m = dashboardModell(daten, { modus: 'jahr', jahr: 2026 });
  assert.equal(m.zielStart, 96.0);
});

test('Modus gesamt: Verlust ab ältestem Eintrag (105.0), Titel nennt Startdatum', () => {
  const m = dashboardModell(daten, { modus: 'gesamt' });
  // ältester Eintrag = 105.0; letzter Gesamtwert = 90.0 → Verlust = 15.0
  assert.ok(Math.abs(m.verlust - 15.0) < 1e-6);
  assert.equal(m.zielStart, 105.0);
  // Titel nennt das Datum des ältesten Eintrags (01.03.2025)
  assert.ok(/01\.03\.2025|2025/.test(m.verlustTitel));
});

test('Ohne Filter verhält sich wie gesamt (Rückwärtskompatibilität)', () => {
  const ohne = dashboardModell(daten);
  const gesamt = dashboardModell(daten, { modus: 'gesamt' });
  assert.equal(ohne.aktuellesGewicht, gesamt.aktuellesGewicht);
  assert.equal(ohne.max.gewicht_kg, gesamt.max.gewicht_kg);
});

test('Leeres Fenster (Jahr ohne Daten) → null-Felder, kein Absturz', () => {
  const m = dashboardModell(daten, { modus: 'jahr', jahr: 2023 });
  assert.equal(m.aktuellesGewicht, null);
  assert.equal(m.max, null);
  assert.equal(m.verlust, null);
});

test('Filter tage: nur die letzten N Tage ab letztem Eintrag', () => {
  // letzter 2026-10-15; 150 Tage zurück → ab ~2026-05-18 → nur 06-01 und 10-15
  const m = dashboardModell(daten, { modus: 'tage', tage: 150 });
  assert.equal(m.max.gewicht_kg, 92.0);
  assert.equal(m.min.gewicht_kg, 90.0);
});
