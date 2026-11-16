// Wiederverwendbare iOS-artige Eingabe-Komponenten (Geschlecht-Segmented, Datums-Rädchen-Picker).

export const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

// Kurz-Kürzel (3 Zeichen) – nur für die Rad-Items im Picker, nicht für die Anzeige-Pille.
export const MONATE_KURZ = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// ---- Pure Datums-Logik (testbar) ----
// ISO "YYYY-MM-DD" -> {tag, monat, jahr} (monat 1-12). Ungültig/leer -> sinnvoller Default (heute-nah).
export function isoZuTeilen(iso) {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [j, m, t] = iso.split('-').map(Number);
    return { tag: t, monat: m, jahr: j };
  }
  return { tag: 1, monat: 1, jahr: 1990 };
}
// {tag,monat,jahr} -> ISO "YYYY-MM-DD" (nullgepolstert). Begrenzt Tag auf gültige Tage des Monats.
export function teileZuIso(tag, monat, jahr) {
  const maxTag = tageImMonat(monat, jahr);
  const t = Math.min(Math.max(1, tag), maxTag);
  const p = (n) => String(n).padStart(2, '0');
  return `${jahr}-${p(monat)}-${p(t)}`;
}
// Anzahl Tage im Monat (monat 1-12), inkl. Schaltjahr.
export function tageImMonat(monat, jahr) {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}
// Hübsche Anzeige "15. Juni 1980" aus ISO.
export function formatiereDatum(iso) {
  const { tag, monat, jahr } = isoZuTeilen(iso);
  return `${tag}. ${MONATE[monat - 1]} ${jahr}`;
}
// Kurze Anzeige "15. Jun 1980" (3-Buchstaben-Monat) — für platzkritische Stellen.
export function formatiereDatumKurz(iso) {
  const { tag, monat, jahr } = isoZuTeilen(iso);
  return `${tag}. ${MONATE_KURZ[monat - 1]} ${jahr}`;
}

const GESCHLECHT_OPTIONEN = [['m','Männlich','M'],['w','Weiblich','W'],['divers','Divers','D']];

// Inline-SVG-Icons (Feather-Stil, stroke=currentColor) — IMMER vor dem Label (lang wie kurz).
// Divers hat kein Feather-Icon → Unicode ⚥ (U+26A5) als Text.
const GESCHLECHT_ICON = {
  m: '<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="14" r="5"/><line x1="13.5" y1="10.5" x2="19" y2="5"/><polyline points="15 5 19 5 19 9"/></svg>',
  w: '<svg class="ico" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>',
  divers: '<span class="gs-uni">⚥</span>',
};

// ---- Segmented-Control fürs Geschlecht ----
// Rendert in `host` ein Segmented-Control. wert = 'm'|'w'|'divers'. onChange(neuerWert) callback.
// Darstellung dynamisch: bei genug Platz ausgeschriebene Labels, bei wenig Platz auf
// M/W/D + Icon gekürzt (per ResizeObserver, analog zu charts.js `beobachteSeg`).
// Liefert ein Objekt mit getWert().
export function geschlechtSegment(host, wert, onChange) {
  // Vorherigen Observer dieses Hosts aufräumen (kein Leak bei Neu-Render).
  if (host._gsObserver) { host._gsObserver.disconnect(); host._gsObserver = null; }
  host.innerHTML = '';
  const seg = document.createElement('div');
  seg.className = 'seg seg-geschlecht';
  let aktuell = GESCHLECHT_OPTIONEN.some(([v]) => v === wert) ? wert : 'm';
  const buttons = [];
  for (const [v, label, kurz] of GESCHLECHT_OPTIONEN) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = v;
    b.dataset.lang = label;
    b.dataset.kurz = kurz;
    b.textContent = label;
    if (v === aktuell) b.classList.add('aktiv');
    b.addEventListener('click', () => {
      aktuell = v;
      for (const kind of seg.children) kind.classList.toggle('aktiv', kind.dataset.v === v);
      onChange?.(v);
    });
    seg.appendChild(b);
    buttons.push(b);
  }
  host.appendChild(seg);

  // Setzt alle Buttons: Icon IMMER davor, Label entweder lang (Männlich…) oder gekürzt (M/W/D).
  function renderModus(kurz) {
    for (const b of buttons) {
      const ikon = GESCHLECHT_ICON[b.dataset.v] || '';
      const text = kurz ? b.dataset.kurz : b.dataset.lang;
      b.innerHTML = ikon + '<span class="gs-text">' + text + '</span>';
    }
  }
  // Misst, ob die ausgeschriebenen Labels einzeilig passen; sonst kürzen.
  function messen() {
    renderModus(false);
    const styles = getComputedStyle(seg);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    let summe = 0;
    for (const b of buttons) summe += b.offsetWidth;
    summe += gap * (buttons.length - 1);
    const passt = summe <= seg.clientWidth + 0.5;
    if (!passt) renderModus(true);
  }
  if (typeof ResizeObserver !== 'undefined') {
    messen();
    host._gsObserver = new ResizeObserver(messen);
    host._gsObserver.observe(host);
  } else {
    renderModus(false);
  }

  return { getWert: () => aktuell };
}

// ---- Datums-Rädchen-Picker ----
// Rendert in `host` eine Anzeige + aufklappbaren Rädchen-Picker. isoWert = "YYYY-MM-DD".
// onChange(neuesIso) callback. formatFn(iso) optional — Standard: formatiereDatum.
// Liefert { getWert() -> iso }.
export function datumsPicker(host, isoWert, onChange, formatFn) {
  const zeigeText = formatFn ?? formatiereDatum;
  let { tag, monat, jahr } = isoZuTeilen(isoWert);
  host.innerHTML = `
    <span class="datum-anzeige" role="button" tabindex="0">
      <span class="datum-text"></span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </span>
    <div class="datum-picker">
      <div class="raeder">
        <div class="rad" data-feld="tag"></div>
        <div class="rad" data-feld="monat"></div>
        <div class="rad" data-feld="jahr"></div>
      </div>
    </div>`;
  const anzeige = host.querySelector('.datum-anzeige');
  const text = host.querySelector('.datum-text');
  const picker = host.querySelector('.datum-picker');
  const radTag = host.querySelector('[data-feld="tag"]');
  const radMonat = host.querySelector('[data-feld="monat"]');
  const radJahr = host.querySelector('[data-feld="jahr"]');

  function iso() { return teileZuIso(tag, monat, jahr); }
  function aktualisiereText() { text.textContent = zeigeText(iso()); }

  function fuelleRad(el, von, bis, selWert, labelFn) {
    el.innerHTML = '';
    for (let v = von; v <= bis; v++) {
      const d = document.createElement('div');
      d.className = 'rad-item' + (v === selWert ? ' sel' : '');
      d.textContent = labelFn ? labelFn(v) : v;
      d.dataset.v = v;
      el.appendChild(d);
    }
  }
  function fuelleTage() { fuelleRad(radTag, 1, tageImMonat(monat, jahr), tag); }
  function zeichneRaeder() {
    fuelleTage();
    fuelleRad(radMonat, 1, 12, monat, (v) => MONATE_KURZ[v - 1]);
    fuelleRad(radJahr, 1930, new Date().getUTCFullYear(), jahr);
  }
  zeichneRaeder();
  aktualisiereText();

  picker.addEventListener('click', (e) => {
    const it = e.target.closest('.rad-item'); if (!it) return;
    const feld = it.parentElement.dataset.feld;
    const v = Number(it.dataset.v);
    if (feld === 'tag') tag = v;
    else if (feld === 'monat') { monat = v; const mx = tageImMonat(monat, jahr); if (tag > mx) tag = mx; }
    else { jahr = v; const mx = tageImMonat(monat, jahr); if (tag > mx) tag = mx; }
    for (const kind of it.parentElement.children) kind.classList.toggle('sel', Number(kind.dataset.v) === v);
    if (feld !== 'tag') fuelleTage(); // Februar/30-Tage-Monate anpassen
    it.scrollIntoView({ block: 'center', behavior: 'smooth' });
    aktualisiereText();
    onChange?.(iso());
  });
  anzeige.addEventListener('click', () => {
    picker.classList.toggle('offen');
    if (picker.classList.contains('offen')) {
      host.querySelectorAll('.rad-item.sel').forEach(x => x.scrollIntoView({ block: 'center' }));
    }
  });

  return {
    getWert: () => iso(),
    // Setzt den Picker programmatisch auf ein neues ISO-Datum (z.B. beim
    // Vorbelegen eines Editier-Formulars / Datumswechsel). Löst KEIN onChange aus.
    setWert: (neuIso) => {
      ({ tag, monat, jahr } = isoZuTeilen(neuIso));
      zeichneRaeder();
      aktualisiereText();
    },
  };
}
