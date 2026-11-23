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
    // Jahr nur am Januar anzeigen, damit die Achse Jahreswechsel markiert.
    return monat === 1 ? `${MONATE_KURZ[0]} ${String(jahr).slice(2)}` : MONATE_KURZ[monat - 1];
  }
  // 'tag' -> Kurz-Format auf ein synthetisches ISO anwenden (zeitzonenfrei).
  const iso = `${jahr}-${String(monat).padStart(2,'0')}-${String(tag).padStart(2,'0')}`;
  return formatKurz(iso, kurzFormat);
}
