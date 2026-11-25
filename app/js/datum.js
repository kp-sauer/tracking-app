// Zentrale, reine Datumsformatierung. KEINE DOM-/Store-Abhaengigkeit —
// das gewuenschte Format wird als Parameter uebergeben. Zeitzonenfrei:
// ISO-Strings werden per split zerlegt, NIE per new Date(iso) (UTC-Versatz).

export const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
export const MONATE_KURZ = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
// Monatsnamen fuer das lange 'wort'-Format (de-DE-Konvention: lange Namen
// werden mit Punkt abgekuerzt, bereits kurze Namen ausgeschrieben).
export const MONATE_LANG_WORT = ['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sept.','Okt.','Nov.','Dez.'];
export const WOCHENTAGE_KURZ = ['So','Mo','Di','Mi','Do','Fr','Sa'];

export const DATUM_LANG_DEFAULT = 'wort';   // 'wort' | 'num' | 'wochentag'
export const DATUM_KURZ_DEFAULT = 'num';    // 'num'  | 'wort'

// ISO 'YYYY-MM-DD' -> {tag,monat,jahr} (monat 1-12). Ungueltig -> null.
function teile(iso) {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [j, m, t] = iso.split('-').map(Number);
    return { tag: t, monat: m, jahr: j };
  }
  return null;
}
const p2 = (n) => String(n).padStart(2, '0');

// Wochentag-Index (0=So..6=Sa) aus ISO, zeitzonenfrei via Date.UTC.
function wochentagIdx(tag, monat, jahr) {
  return new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay();
}

// Langes Datum: 'wort' -> '31. Okt. 2026', 'num' -> '31.10.2026',
// 'wochentag' -> 'Sa, 31.10.2026'. Fallback auf 'wort'.
export function formatLang(iso, format) {
  const d = teile(iso);
  if (!d) return '';
  const { tag, monat, jahr } = d;
  if (format === 'num') return `${p2(tag)}.${p2(monat)}.${jahr}`;
  if (format === 'wochentag') {
    return `${WOCHENTAGE_KURZ[wochentagIdx(tag, monat, jahr)]}, ${p2(tag)}.${p2(monat)}.${jahr}`;
  }
  return `${tag}. ${MONATE_LANG_WORT[monat - 1]} ${jahr}`; // 'wort' + Fallback
}

// Kurzes Datum (ohne Jahr): 'num' -> '31.10.', 'wort' -> '31. Okt'. Fallback 'num'.
export function formatKurz(iso, format) {
  const d = teile(iso);
  if (!d) return '';
  const { tag, monat } = d;
  if (format === 'wort') return `${tag}. ${MONATE_KURZ[monat - 1]}`;
  return `${tag}.${monat}.`; // 'num' + Fallback (ohne Null-Polsterung, kompakt)
}

// Waehlt die Achsen-Granularitaet aus der sichtbaren Spanne (Sekunden).
// Schwellen sind Richtwerte: <=45 Tage Tag, bis ~18 Monate Monat, sonst Jahr.
const TAG_S = 86400;
export function achsenGranularitaet(spanneSek) {
  const tage = spanneSek / TAG_S;
  if (tage <= 45) return 'tag';
  if (tage <= 548) return 'monat';   // ~18 Monate
  return 'jahr';
}

// Label fuer EINEN Achsen-Tick. tickSek = UTC-Sekunden (uPlot time-Skala).
// granularitaet aus achsenGranularitaet(); kurzFormat = profil.datum_kurz.
export function formatAchse(tickSek, granularitaet, kurzFormat) {
  const d = new Date(tickSek * 1000);
  const tag = d.getUTCDate(), monat = d.getUTCMonth() + 1, jahr = d.getUTCFullYear();
  if (granularitaet === 'jahr') return String(jahr);
  if (granularitaet === 'monat') {
    // Nur Monatsname. Das Jahr kommt in der Chart-Achse ueber eine zweite Zeile
    // (am ersten Tick + Jahreswechsel), daher hier KEIN Jahr mehr anhaengen.
    return MONATE_KURZ[monat - 1];
  }
  // 'tag' -> Kurz-Format auf ein synthetisches ISO anwenden (zeitzonenfrei).
  const iso = `${jahr}-${String(monat).padStart(2,'0')}-${String(tag).padStart(2,'0')}`;
  return formatKurz(iso, kurzFormat);
}

// Achsen-Ticks fuer die Monats-Granularitaet: je EIN Tick pro Monat, naemlich
// der Monatserste 00:00 UTC. Verhindert, dass uPlot mehrere Ticks innerhalb
// desselben Monats setzt (sonst taucht derselbe Monatsname mehrfach auf).
// minSek/maxSek = UTC-Sekunden (uPlot time-Skala). Rueckgabe: aufsteigendes
// Array von UTC-Sekunden. Zeitzonenfrei via Date.UTC/getUTC* (wie im Rest).
export function monatsTicksSek(minSek, maxSek) {
  if (!Number.isFinite(minSek) || !Number.isFinite(maxSek)) return [];
  if (minSek > maxSek) return [];
  // Monat des Startzeitpunkts bestimmen (UTC) und auf den Monatsersten setzen.
  const start = new Date(minSek * 1000);
  let jahr = start.getUTCFullYear();
  let monatIdx = start.getUTCMonth(); // 0-11
  const ticks = [];
  // Monat fuer Monat voran; Date.UTC normalisiert den Dez->Jan-Ueberlauf selbst.
  for (;;) {
    const tick = Date.UTC(jahr, monatIdx, 1) / 1000;
    if (tick > maxSek) break;
    ticks.push(tick);
    monatIdx += 1; // Dez (11) -> 12 wird von Date.UTC in Jan des Folgejahres uebersetzt
  }
  return ticks;
}

// Achsen-Ticks fuer die Jahr-Granularitaet: je EIN Tick pro Jahr, naemlich der
// Jahreserste (1. Januar 00:00 UTC). Analog zu monatsTicksSek — verhindert, dass
// uPlot mehrere Ticks innerhalb desselben Jahres setzt (sonst taucht dieselbe
// Jahreszahl mehrfach auf, z.B. 2023·2023·2024·2024). minSek/maxSek = UTC-Sekunden.
// Rueckgabe: aufsteigendes Array von UTC-Sekunden. Zeitzonenfrei via Date.UTC/getUTC*.
export function jahresTicksSek(minSek, maxSek) {
  if (!Number.isFinite(minSek) || !Number.isFinite(maxSek)) return [];
  if (minSek > maxSek) return [];
  // Jahr des Startzeitpunkts bestimmen (UTC) und auf den Jahresersten setzen.
  let jahr = new Date(minSek * 1000).getUTCFullYear();
  const ticks = [];
  // Jahr fuer Jahr voran, solange der 1. Januar noch <= maxSek liegt.
  for (;;) {
    const tick = Date.UTC(jahr, 0, 1) / 1000;
    if (tick > maxSek) break;
    ticks.push(tick);
    jahr += 1;
  }
  return ticks;
}

// Entscheidet, ob ein Monats-Tick ein LABEL bekommt (nur die erste Achsen-Zeile,
// der Monatsname). Lange Spannen (>12 Monats-Ticks) draengen auf schmalen Displays
// bis zu ~18 Labels nebeneinander → wir duennen die Beschriftung aus: jeder zweite
// Tick (ab Index 0) bleibt beschriftet, die dazwischen bleiben als Tick/Gitterlinie
// erhalten, aber ohne Monatsname. Bei <=12 Ticks bleibt JEDER Monat beschriftet.
// Wahl: Start bei Index 0 → der erste Tick (traegt die Jahr-Zweitzeile) ist IMMER
// sichtbar. Der letzte Tick kann bei gerader Tickzahl unbeschriftet sein — das ist
// akzeptiert; wichtiger ist gleichmaessiges Raster + sichtbarer erster Tick.
// index = Position im splits-Array, anzahlTicks = splits.length.
export function monatsLabelSichtbar(index, anzahlTicks) {
  if (anzahlTicks <= 12) return true;
  return index % 2 === 0;
}
