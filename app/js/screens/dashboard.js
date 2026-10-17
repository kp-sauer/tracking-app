import { dashboardModell } from '../kpi.js';
import { nachDatumSortiert, imZeitfenster } from '../db.js';
import { wAvgSerie, zielInKg, DEFAULT_ZIEL, zielgewicht } from '../calc.js';
import { icon } from '../icons.js';

const r1 = (x) => (x == null ? '–' : x.toFixed(1));
const r2 = (x) => (x == null ? '–' : x.toFixed(2));
const kg = (x) => (x == null ? '–' : x.toFixed(1).replace('.', ',') + ' kg');

// BMI-Einordnung nach WHO-Klassifikation für Erwachsene (bestätigt gegen deutsche
// Leitlinien, u. a. Adipositas-Gesellschaft/AWMF): < 18,5 Unter-, 18,5–24,9 Normal-,
// 25–29,9 Über-, 30–34,9 Adipositas I, 35–39,9 II, ≥ 40 III.
export function bmiKlasse(b) {
  if (b == null) return '';
  if (b < 18.5) return 'Untergewicht';
  if (b < 25) return 'Normalgewicht';
  if (b < 30) return 'Übergewicht';
  if (b < 35) return 'Adipositas Grad I';
  if (b < 40) return 'Adipositas Grad II';
  return 'Adipositas Grad III';
}

// Reine Hilfsfunktion: wandelt eine Werteserie in SVG-Polyline-Punkte ("x,y x,y ...").
// null-Werte werden übersprungen, x folgt dem Original-Index. y wird invertiert
// (großer Wert = oben). min/max optional, damit mehrere Serien dieselbe Skala teilen.
export function sparklinePunkte(werte, breite, hoehe, minVor, maxVor) {
  if (!Array.isArray(werte) || werte.length < 2) return '';
  const echte = werte.filter(v => v != null && Number.isFinite(v));
  if (echte.length < 2) return '';
  const min = minVor != null ? minVor : Math.min(...echte);
  const max = maxVor != null ? maxVor : Math.max(...echte);
  const spanne = max - min;
  const rand = 4; // kleiner vertikaler Rand, damit Extrempunkte nicht am Rand kleben
  const schrittX = breite / (werte.length - 1);
  const punkte = [];
  for (let i = 0; i < werte.length; i++) {
    const v = werte[i];
    if (v == null || !Number.isFinite(v)) continue;
    const x = i * schrittX;
    const y = spanne === 0
      ? hoehe / 2
      : rand + (1 - (v - min) / spanne) * (hoehe - 2 * rand);
    punkte.push(x.toFixed(1) + ',' + y.toFixed(1));
  }
  return punkte.join(' ');
}

function datenJahre(daten) {
  return [...new Set(nachDatumSortiert(daten).map(t => +t.datum.slice(0, 4)))].sort();
}

export function renderDashboard(container, ctx) {
  const jahre = datenJahre(ctx.store.get());
  const jahrMax = jahre.length ? jahre[jahre.length - 1] : new Date().getUTCFullYear();
  const jahrMin = jahre.length ? jahre[0] : jahrMax;
  const filter = { modus: 'gesamt', jahr: jahrMax, tage: 90 };

  function zeichne() {
    const daten = ctx.store.get();
    const m = dashboardModell(daten, filter);

    // Hero ist IMMER global (filter-unabhängig): zeigt den aktuellen Ist-Zustand.
    // Eigene, ungefilterte W-AVG-Serie über den Gesamtbestand.
    const alleTage = nachDatumSortiert(daten);
    const alleTageWavg = wAvgSerie(alleTage);
    const heroGewicht = alleTageWavg.length ? alleTageWavg[alleTageWavg.length - 1].gewicht_kg : null;
    const letztesDatum = alleTage.length ? alleTage[alleTage.length - 1].datum : null;
    const heute = new Date().toISOString().slice(0, 10);
    const heuteNochKeinWert = letztesDatum !== heute;
    const heroWavg = alleTageWavg.map(t => t.w_avg).filter(v => v != null);
    let heroTrend = null;
    if (heroWavg.length >= 2) heroTrend = heroWavg[heroWavg.length - 2] - heroWavg[heroWavg.length - 1];
    const heroTrendRunter = heroTrend != null && heroTrend >= 0; // Abnahme = gut
    // Amber-Zone: Zunahme 0–1 kg = orange, >1 kg = rot.
    const heroTrendKlasse = heroTrend == null ? '' : heroTrend >= 0 ? 'gut' : (Math.abs(heroTrend) <= 1 ? 'warn' : 'schlecht');
    const heroAvg = heroWavg.length ? heroWavg[heroWavg.length - 1] : null; // aktueller 7-Tage-Schnitt

    // Chart-Serien auf dem gefilterten Fenster (W-AVG neu auf Teilmenge gerechnet).
    const fenster = wAvgSerie(imZeitfenster(nachDatumSortiert(daten), filter));
    const gewichte = fenster.map(t => t.gewicht_kg);
    const wavgs = fenster.map(t => t.w_avg);
    const CW = 300, CH = 110;
    let gMin = null, gMax = null;
    const alle = [...gewichte, ...wavgs].filter(v => v != null && Number.isFinite(v));
    if (alle.length) { gMin = Math.min(...alle); gMax = Math.max(...alle); }
    const pGewicht = sparklinePunkte(gewichte, CW, CH, gMin, gMax);
    const pWavg = sparklinePunkte(wavgs, CW, CH, gMin, gMax);

    // ---- Ziel + Marker (filter-unabhängige Nutzer-Ziele aus dem Profil) ----
    const groesse = daten.profil?.koerpergroesse_m ?? 1.75;
    const ziel = daten.profil?.ziel ?? DEFAULT_ZIEL;
    const zielKg = zielInKg(ziel, groesse);

    // Fortschritt von zielStart (Fenster-/Projektstart) → zielKg, aktueller Stand m.aktuellesGewicht.
    let proz = null;
    if (m.aktuellesGewicht != null && m.zielStart != null && m.zielStart > zielKg) {
      proz = Math.max(0, Math.min(100, Math.round((m.zielStart - m.aktuellesGewicht) / (m.zielStart - zielKg) * 100)));
    }

    // Marker auf dem Balken: Position in % entlang der Strecke zielStart → zielKg.
    // Nur Marken, die ECHT dazwischen liegen. aktuell = m.aktuellesGewicht.
    function markerPos(kg) {
      if (m.zielStart == null || m.zielStart <= zielKg) return null;
      const pos = (m.zielStart - kg) / (m.zielStart - zielKg) * 100;
      return (pos > 0 && pos < 100) ? pos : null;
    }
    const marker = [];
    // Persönliche Zwischenziele (prominent, mit Label). Array `zwischenziele` (0–2),
    // migriert ein evtl. altes einzelnes `zwischenziel`.
    const zwListe = Array.isArray(daten.profil?.zwischenziele)
      ? daten.profil.zwischenziele
      : (daten.profil?.zwischenziel ? [daten.profil.zwischenziel] : []);
    for (const zw of zwListe) {
      const zwKg = zielInKg(zw, groesse);
      const pos = markerPos(zwKg);
      if (pos != null) {
        const erreicht = m.aktuellesGewicht != null && m.aktuellesGewicht <= zwKg;
        marker.push({ pos, typ: 'eigen', erreicht, label: zwKg.toFixed(1).replace('.', ',') + ' kg' });
      }
    }
    // WHO-Schwellen (dezent, ohne Label): BMI 40/35/30, soweit zwischen Start und Ziel.
    // Fällt eine Schwelle (fast) mit einem eigenen Zwischenziel zusammen, wird sie weggelassen
    // (das prominente Zwischenziel-Label gewinnt), damit nichts doppelt gezeichnet wird.
    const eigenPositionen = marker.filter(mk => mk.typ === 'eigen').map(mk => mk.pos);
    for (const schwelle of [40, 35, 30]) {
      const kg = zielgewicht(schwelle, groesse);
      const pos = markerPos(kg);
      if (pos != null && !eigenPositionen.some(ep => Math.abs(pos - ep) < 1.5)) {
        const erreicht = m.aktuellesGewicht != null && m.aktuellesGewicht <= kg;
        marker.push({ pos, typ: 'who', erreicht, label: 'BMI ' + schwelle });
      }
    }

    // Kontext-Steuerung (Jahr-Stepper / Tage-Pills)
    let kontext = '';
    if (filter.modus === 'jahr') {
      kontext = `<span class="stepper">
        <button data-step="-1" ${filter.jahr <= jahrMin ? 'disabled' : ''}>${icon('chevron-links')}</button>
        <span class="j">${filter.jahr}</span>
        <button data-step="1" ${filter.jahr >= jahrMax ? 'disabled' : ''}>${icon('chevron-rechts')}</button></span>`;
    } else if (filter.modus === 'tage') {
      const istEigene = ![90, 180].includes(filter.tage);
      kontext = `<span class="tage-pills">
        <button class="tp ${filter.tage === 90 ? 'aktiv' : ''}" data-tage="90">90</button>
        <button class="tp ${filter.tage === 180 ? 'aktiv' : ''}" data-tage="180">180</button>
        <button class="tp ${istEigene ? 'aktiv' : ''}" data-tage="eigene">+ Eigene</button></span>`;
    }

    container.innerHTML = `
      <section class="hero">
        <div class="hero-label">Aktuelles Gewicht</div>
        <div class="hero-wert">${heroGewicht == null ? '–' : heroGewicht.toFixed(1).replace('.', ',')}<span class="einheit">kg</span></div>
        ${heuteNochKeinWert && heroGewicht != null ? '<div class="hero-kein-wert">Heute noch kein Wert erfasst</div>' : ''}
        <div class="hero-pills">
          ${heroTrend == null ? '' : `<span class="pill ${heroTrendKlasse}">${heroTrendRunter ? icon('trend-runter') : icon('trend-hoch')} ${Math.abs(heroTrend).toFixed(1).replace('.', ',')} kg · 7-Tage-Schnitt</span>`}
          ${heroAvg == null ? '' : `<span class="pill neutral">Ø ${heroAvg.toFixed(1).replace('.', ',')} kg</span>`}
        </div>
      </section>

      <section class="filter">
        <div class="filterzeile">
          <div class="seg" id="dash-seg">
            <button data-m="gesamt" class="${filter.modus === 'gesamt' ? 'aktiv' : ''}">Gesamt</button>
            <button data-m="jahr" class="${filter.modus === 'jahr' ? 'aktiv' : ''}">Jahr</button>
            <button data-m="tage" class="${filter.modus === 'tage' ? 'aktiv' : ''}">Tage</button>
          </div>
          <div id="dash-kontext">${kontext}</div>
        </div>
        <div class="eigene-feld ${filter.modus === 'tage' && ![90,180].includes(filter.tage) ? 'auf' : ''}" id="dash-eigene">
          <label>Eigene Anzahl</label>
          <span class="num">
            <button data-eigene="-1" aria-label="weniger">${icon('minus')}</button>
            <input id="dash-eInput" type="number" min="1" max="3650" value="${filter.tage}">
            <button data-eigene="1" aria-label="mehr">${icon('plus')}</button>
          </span>
          <span class="einheit">Tage</span>
        </div>
      </section>

      <section class="kpi-grid">
        <div class="kpi-tile"><div class="k-label">BMI</div><div class="k-wert">${r2(m.bmi)}</div><div class="k-sub">${bmiKlasse(m.bmi)}</div></div>
        <div class="kpi-tile"><div class="k-label">${m.verlustTitel ?? 'Verloren'}</div><div class="k-wert ${m.verlust != null && m.verlust >= 0 ? 'positiv' : ''}">${m.verlust == null ? '–' : (m.verlust >= 0 ? '−' : '+') + Math.abs(m.verlust).toFixed(1).replace('.', ',') + ' kg'}</div></div>
        <div class="kpi-tile"><div class="k-label">Maximum</div><div class="k-wert">${kg(m.max?.gewicht_kg)}</div><div class="k-sub">${m.max?.datum ?? '–'}</div></div>
        <div class="kpi-tile"><div class="k-label">Minimum</div><div class="k-wert">${kg(m.min?.gewicht_kg)}</div><div class="k-sub">${m.min?.datum ?? '–'}</div></div>
      </section>

      <section class="ziel-karte">
        <div class="ziel-kopf"><span class="titel">Weg zum Ziel</span><span class="proz">${proz == null ? '–' : proz + ' %'}</span></div>
        <div class="balken">
          <span class="fuell" style="width:${proz ?? 0}%"></span>
          ${marker.map(mk => mk.typ === 'eigen'
            ? `<span class="marker marker-eigen ${mk.erreicht ? 'erreicht' : ''}" style="left:${mk.pos}%"><span class="m-label ${mk.pos > 72 ? 'links' : ''}">${mk.erreicht ? icon('check') + ' ' : ''}${mk.label}</span></span>`
            : `<span class="marker marker-who ${mk.erreicht ? 'erreicht' : ''}" style="left:${mk.pos}%" aria-label="${mk.label}"><span class="who-label ${mk.pos > 85 ? 'links' : mk.pos < 15 ? 'rechts' : ''}">${mk.erreicht ? icon('check') + ' ' : ''}${mk.label}</span></span>`
          ).join('')}
        </div>
        <div class="ziel-fuss"><span>Start <b>${kg(m.zielStart)}</b></span><span>Ziel <b>${kg(zielKg)}</b></span></div>
      </section>

      <section class="chart-karte">
        <div class="chart-titel">Verlauf</div>
        <div class="legende">
          <span><span class="leg-strich" style="background:var(--chart-linie)"></span>Gewicht</span>
          <span><span class="leg-strich leg-trend"></span>7-Tage Ø</span>
        </div>
        ${pGewicht === '' ? '<p class="leer-hinweis">Noch zu wenig Daten für den Verlauf.</p>' : `
        <svg class="spark" viewBox="0 0 ${CW} ${CH}" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="${pGewicht}" fill="none" stroke="var(--chart-linie)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ${pWavg === '' ? '' : `<polyline points="${pWavg}" fill="none" stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"/>`}
        </svg>`}
      </section>`;

    verdrahte();
  }

  function verdrahte() {
    container.querySelector('#dash-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      filter.modus = b.dataset.m; zeichne();
    });
    const kontext = container.querySelector('#dash-kontext');
    kontext.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.step) {
        filter.jahr = Math.max(jahrMin, Math.min(jahrMax, filter.jahr + (+b.dataset.step))); zeichne();
      } else if (b.dataset.tage) {
        if (b.dataset.tage === 'eigene') { if ([90,180].includes(filter.tage)) filter.tage = 120; }
        else filter.tage = +b.dataset.tage;
        zeichne();
      }
    });
    const eigene = container.querySelector('#dash-eigene');
    if (eigene) {
      const input = container.querySelector('#dash-eInput');
      eigene.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-eigene]'); if (!b) return;
        filter.tage = Math.max(1, Math.min(3650, filter.tage + (+b.dataset.eigene))); zeichne();
      });
      input.addEventListener('change', () => {
        filter.tage = Math.max(1, Math.min(3650, parseInt(input.value, 10) || 1)); zeichne();
      });
    }
  }

  zeichne();
}
