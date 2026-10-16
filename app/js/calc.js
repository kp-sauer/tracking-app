// Reine Funktionen, die die Excel-Formeln spiegeln. Keine DOM-/DB-Abhängigkeit.

// BMI = Gewicht / Größe² (Größe in Metern).
export function bmi(gewichtKg, groesseM) {
  return gewichtKg / (groesseM * groesseM);
}

// Zielgewicht aus BMI-Schwelle: Schwelle × Größe².
export function zielgewicht(bmiSchwelle, groesseM) {
  return bmiSchwelle * groesseM * groesseM;
}

// Standard-Ziel, solange der Nutzer nichts gesetzt hat.
export const DEFAULT_ZIEL = { typ: 'bmi', wert: 25 };

// Normalisiert ein gespeichertes Ziel { typ:'bmi'|'kg', wert } auf ein gültiges Objekt;
// fällt bei fehlend/ungültig auf DEFAULT_ZIEL zurück.
function gueltigesZiel(ziel) {
  if (ziel && (ziel.typ === 'bmi' || ziel.typ === 'kg') && Number.isFinite(Number(ziel.wert))) {
    return { typ: ziel.typ, wert: Number(ziel.wert) };
  }
  return DEFAULT_ZIEL;
}

// Löst ein Ziel in Kilogramm auf (bmi-Ziel × Größe², kg-Ziel unverändert).
export function zielInKg(ziel, groesseM) {
  const z = gueltigesZiel(ziel);
  return z.typ === 'kg' ? z.wert : zielgewicht(z.wert, groesseM);
}

// Löst ein Ziel in BMI auf (kg-Ziel / Größe², bmi-Ziel unverändert).
export function zielInBmi(ziel, groesseM) {
  const z = gueltigesZiel(ziel);
  return z.typ === 'bmi' ? z.wert : bmi(z.wert, groesseM);
}

// Diff zum Vortag: Vortag − heute. Positiv = Abnahme (Excel-Konvention).
export function diff(gewichtVortag, gewichtHeute) {
  return gewichtVortag - gewichtHeute;
}

// Gesamtverlust: erstes je erfasstes Gewicht − aktuelles Gewicht.
export function gesamtverlust(erstesGewicht, aktuellesGewicht) {
  return erstesGewicht - aktuellesGewicht;
}

// Gleitender 7-Tage-Schnitt des Gewichts. Erst ab 7 vorliegenden Werten definiert; sonst null.
export function wAvg(fensterGewichte) {
  if (!Array.isArray(fensterGewichte) || fensterGewichte.length < 7) return null;
  const letzte7 = fensterGewichte.slice(-7);
  return letzte7.reduce((s, g) => s + g, 0) / 7;
}

// W-AVG-Diff: Gewicht vor 7 Tagen − aktueller 7-Tage-Schnitt.
export function wAvgDiff(gewichtVor7Tagen, aktuellerSchnitt) {
  return gewichtVor7Tagen - aktuellerSchnitt;
}

// Datums-Helfer arbeiten mit ISO-Strings "YYYY-MM-DD" und bauen UTC-Daten,
// um Zeitzonen-Verschiebungen zu vermeiden.
function parseIso(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return new Date(Date.UTC(j, m - 1, t));
}

// Vollendete Jahre zwischen Geburtsdatum und Stichtag.
export function alter(geburtsIso, stichtagIso) {
  const g = parseIso(geburtsIso);
  const s = parseIso(stichtagIso);
  let a = s.getUTCFullYear() - g.getUTCFullYear();
  const vorGeburtstag =
    s.getUTCMonth() < g.getUTCMonth() ||
    (s.getUTCMonth() === g.getUTCMonth() && s.getUTCDate() < g.getUTCDate());
  if (vorGeburtstag) a -= 1;
  return a;
}

// ISO-8601-Kalenderwoche.
export function kalenderwoche(iso) {
  const date = parseIso(iso);

  // Finde den Donnerstag dieser Woche
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 3);

  // Januar 4 ist immer in Woche 1; 4. Januar als ISO-Anker finden
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));

  // Montag von Woche 1
  const week1Start = new Date(jan4);
  week1Start.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));

  // Berechne Wochennummer
  const daysSinceWeek1Start = Math.floor((thursday - week1Start) / 86400000);
  return Math.floor(daysSinceWeek1Start / 7) + 1;
}

// Deutscher Wochentag-Kurzname.
export function wochentag(iso) {
  const namen = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return namen[parseIso(iso).getUTCDay()];
}

// Erwartet nach Datum aufsteigend sortierte Tageseinträge [{datum, gewicht_kg}, ...].
// Liefert dieselbe Liste, je Tag ergänzt um w_avg (null, solange <7 Vorwerte vorliegen).
export function wAvgSerie(sortierteTage) {
  return sortierteTage.map((tag, i) => {
    const fenster = sortierteTage.slice(Math.max(0, i - 6), i + 1).map(t => t.gewicht_kg);
    return { ...tag, w_avg: wAvg(fenster) };
  });
}

// Lineare Trendgerade (Least-Squares) über eine Werteserie, indexbasiert (x = 0..n-1).
// Spiegelt die „lineare Trendlinie" der Excel-Charts. Gibt für JEDEN Index den
// Geraden-y zurück (Array gleicher Länge wie `werte`); null-Werte werden bei der
// Regression übersprungen, aber die Gerade über alle Indizes ausgewertet.
// < 2 echte Punkte → Array aus null (keine sinnvolle Gerade).
export function lineareTrend(werte) {
  if (!Array.isArray(werte)) return [];
  const pkt = [];
  for (let i = 0; i < werte.length; i++) {
    const v = werte[i];
    if (v != null && Number.isFinite(v)) pkt.push([i, v]);
  }
  if (pkt.length < 2) return werte.map(() => null);
  const n = pkt.length;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (const [x, y] of pkt) { sx += x; sy += y; sxy += x * y; sxx += x * x; }
  const nenner = n * sxx - sx * sx;
  if (nenner === 0) return werte.map(() => null);
  const steigung = (n * sxy - sx * sy) / nenner;
  const achse = (sy - steigung * sx) / n;
  return werte.map((_, i) => achse + steigung * i);
}
