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

const GESCHLECHT_OPTIONEN = [['m','Männlich'],['w','Weiblich'],['divers','Divers']];

// ---- Segmented-Control fürs Geschlecht ----
// Rendert in `host` ein Segmented-Control. wert = 'm'|'w'|'divers'. onChange(neuerWert) callback.
// Liefert ein Objekt mit getWert().
export function geschlechtSegment(host, wert, onChange) {
  host.innerHTML = '';
  const seg = document.createElement('div');
  seg.className = 'seg';
  let aktuell = GESCHLECHT_OPTIONEN.some(([v]) => v === wert) ? wert : 'm';
  for (const [v, label] of GESCHLECHT_OPTIONEN) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.v = v;
    if (v === aktuell) b.classList.add('aktiv');
    b.addEventListener('click', () => {
      aktuell = v;
      for (const kind of seg.children) kind.classList.toggle('aktiv', kind.dataset.v === v);
      onChange?.(v);
    });
    seg.appendChild(b);
  }
  host.appendChild(seg);
  return { getWert: () => aktuell };
}

// ---- Datums-Rädchen-Picker ----
// Rendert in `host` eine Anzeige + aufklappbaren Rädchen-Picker. isoWert = "YYYY-MM-DD".
// onChange(neuesIso) callback. Liefert { getWert() -> iso }.
export function datumsPicker(host, isoWert, onChange) {
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
  function aktualisiereText() { text.textContent = formatiereDatum(iso()); }

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
