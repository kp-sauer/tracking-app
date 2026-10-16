import { bmi, diff, gesamtverlust, zielgewicht } from './calc.js';
import { nachDatumSortiert, imZeitfenster } from './db.js';

// Formatiert ein ISO-Datum als deutsches TT.MM.JJJJ (für dynamische Kachel-Titel).
function deDatum(iso) {
  const [j, m, t] = iso.split('-');
  return `${t}.${m}.${j}`;
}

// Baut das Anzeige-Modell fürs Dashboard aus Rohdaten. Der Projekt-Startwert wird
// dynamisch aus dem ältesten Tageseintrag im Gesamtbestand abgeleitet.
// filter = { modus:'gesamt'|'jahr'|'tage', jahr?, tage? } schränkt den Zeitraum ein (Default: gesamt).
export function dashboardModell(daten, filter = { modus: 'gesamt' }) {
  const groesse = daten.profil?.koerpergroesse_m ?? 1.75;
  const alleTage = nachDatumSortiert(daten);
  const tage = imZeitfenster(alleTage, filter);

  // Projekt-Startwert = ältester Tageseintrag im Gesamtbestand (nicht hartkodiert).
  const projektStart = alleTage.length ? alleTage[0] : null;
  const startGewichtGesamt = projektStart ? projektStart.gewicht_kg : null;

  const leer = {
    aktuellesGewicht: null, startGewichtJahr: null, bmi: null, diffZumStart: null,
    gesamtverlust: null, verlust: null, verlustTitel: null, zielStart: null,
    max: null, min: null,
    ziel30: zielgewicht(30, groesse), ziel25: zielgewicht(25, groesse),
  };
  if (tage.length === 0) return leer;

  const start = tage[0];
  const aktuell = tage[tage.length - 1];
  const istGesamt = !filter || filter.modus === 'gesamt' || filter.modus == null;

  let max = tage[0], min = tage[0];
  for (const t of tage) {
    if (t.gewicht_kg > max.gewicht_kg) max = t;
    if (t.gewicht_kg < min.gewicht_kg) min = t;
  }

  // Verlust + Startpunkt für "Weg zum Ziel": bei gesamt ab Projektstart (ältester Eintrag),
  // sonst innerhalb des Fensters (erster Wert im Fenster).
  const zielStart = istGesamt ? startGewichtGesamt : start.gewicht_kg;
  const verlust = istGesamt
    ? (startGewichtGesamt != null ? gesamtverlust(startGewichtGesamt, aktuell.gewicht_kg) : null)
    : diff(start.gewicht_kg, aktuell.gewicht_kg);
  const verlustTitel = istGesamt
    ? (projektStart ? `Gesamt verloren seit ${deDatum(projektStart.datum)}` : 'Gesamt verloren')
    : filter.modus === 'jahr'
      ? `Verloren in ${filter.jahr}`
      : `Verloren (letzte ${filter.tage} Tage)`;

  return {
    aktuellesGewicht: aktuell.gewicht_kg,
    startGewichtJahr: start.gewicht_kg,
    bmi: bmi(aktuell.gewicht_kg, groesse),
    diffZumStart: diff(start.gewicht_kg, aktuell.gewicht_kg),
    gesamtverlust: startGewichtGesamt != null ? gesamtverlust(startGewichtGesamt, aktuell.gewicht_kg) : null,
    verlust,
    verlustTitel,
    zielStart,
    max: { datum: max.datum, gewicht_kg: max.gewicht_kg },
    min: { datum: min.datum, gewicht_kg: min.gewicht_kg },
    ziel30: zielgewicht(30, groesse),
    ziel25: zielgewicht(25, groesse),
  };
}
