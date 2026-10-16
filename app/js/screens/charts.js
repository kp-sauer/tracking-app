import { nachDatumSortiert, imZeitfenster } from '../db.js';
import { wAvgSerie, lineareTrend, zielInKg, DEFAULT_ZIEL } from '../calc.js';
import { icon } from '../icons.js';

// Pure Aufbereitung: X = UTC-Sekunden (uPlot-Konvention), Gewicht, W-AVG, Trend.
// `fensterTage` wird vom gefilterten Zeitfenster bestimmt; hier bekommen wir bereits
// die gefilterte, w_avg-angereicherte Tagesliste.
export function chartSerien(tage) {
  const x = tage.map(t => Date.parse(t.datum + 'T00:00:00Z') / 1000);
  const gewicht = tage.map(t => t.gewicht_kg);
  const wavg = tage.map(t => t.w_avg);
  const trend = lineareTrend(gewicht);
  return { x, gewicht, wavg, trend };
}

function datenJahre(daten) {
  return [...new Set(nachDatumSortiert(daten).map(t => +t.datum.slice(0, 4)))].sort();
}

// Serien-Definitionen: key steuert Sichtbarkeit, Farbe folgt den Chart-Tokens.
const SERIEN = [
  { key: 'gewicht', label: 'Gewicht', farbe: 'var(--chart-linie)' },
  { key: 'wavg', label: '7-Tage Ø', farbe: 'var(--warn)' },
  { key: 'trend', label: 'Trend', farbe: 'var(--chart-trend)' },
  { key: 'ziel', label: 'Ziel', farbe: 'var(--gut)' },
];

export function renderCharts(container, ctx) {
  const jahre = datenJahre(ctx.store.get());
  const jahrMax = jahre.length ? jahre[jahre.length - 1] : new Date().getUTCFullYear();
  const jahrMin = jahre.length ? jahre[0] : jahrMax;
  // Zustand: Zeitfilter (wie Dashboard) + welche Serien sichtbar sind + Vollbild.
  const filter = { modus: 'gesamt', jahr: jahrMax, tage: 90 };
  const sichtbar = { gewicht: true, wavg: true, trend: false, ziel: false };
  let vollbild = false;
  let plot = null;

  // CSS-Variablen zur Laufzeit auflösen (uPlot braucht konkrete Farben, keine var()).
  function farbe(cssVar) {
    const name = cssVar.replace('var(', '').replace(')', '').trim();
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2563eb';
  }

  function kontextHtml() {
    if (filter.modus === 'jahr') {
      return `<span class="stepper">
        <button data-step="-1" ${filter.jahr <= jahrMin ? 'disabled' : ''}>${icon('chevron-links')}</button>
        <span class="j">${filter.jahr}</span>
        <button data-step="1" ${filter.jahr >= jahrMax ? 'disabled' : ''}>${icon('chevron-rechts')}</button></span>`;
    }
    if (filter.modus === 'tage') {
      const istEigene = ![90, 180].includes(filter.tage);
      return `<span class="tage-pills">
        <button class="tp ${filter.tage === 90 ? 'aktiv' : ''}" data-tage="90">90</button>
        <button class="tp ${filter.tage === 180 ? 'aktiv' : ''}" data-tage="180">180</button>
        <button class="tp ${istEigene ? 'aktiv' : ''}" data-tage="eigene">+ Eigene</button></span>`;
    }
    return '';
  }

  function chipsHtml() {
    return SERIEN.map(s =>
      `<button class="serie-chip ${sichtbar[s.key] ? 'aktiv' : ''}" data-serie="${s.key}">
         <span class="serie-punkt" style="background:${s.farbe}"></span>${s.label}
       </button>`
    ).join('');
  }

  function baue() {
    container.innerHTML = `
      <section class="charts-screen ${vollbild ? 'vollbild' : ''}" id="charts-root">
        <div class="charts-leiste">
          <div class="seg" id="ch-seg">
            <button data-m="gesamt" class="${filter.modus === 'gesamt' ? 'aktiv' : ''}">Gesamt</button>
            <button data-m="jahr" class="${filter.modus === 'jahr' ? 'aktiv' : ''}">Jahr</button>
            <button data-m="tage" class="${filter.modus === 'tage' ? 'aktiv' : ''}">Tage</button>
          </div>
          <button class="ch-voll" id="ch-voll" aria-label="${vollbild ? 'Vollbild verlassen' : 'Vollbild'}">
            ${vollbild ? icon('x') : VOLLBILD_ICON}
          </button>
        </div>
        <div class="charts-kontext-zeile" id="ch-kontext" ${kontextHtml() ? '' : 'hidden'}>${kontextHtml()}</div>
        <div class="eigene-feld ${filter.modus === 'tage' && ![90,180].includes(filter.tage) ? 'auf' : ''}" id="ch-eigene">
          <label>Eigene Anzahl</label>
          <span class="num">
            <button data-eigene="-1" aria-label="weniger">${icon('minus')}</button>
            <input id="ch-eInput" type="number" min="1" max="3650" value="${filter.tage}">
            <button data-eigene="1" aria-label="mehr">${icon('plus')}</button>
          </span>
          <span class="einheit">Tage</span>
        </div>
        <div class="serie-chips" id="ch-chips">${chipsHtml()}</div>
        <div class="chart-flaeche" id="ch-plot"></div>
      </section>`;
    zeichnePlot();
    verdrahte();
  }

  function zeichnePlot() {
    const host = container.querySelector('#ch-plot');
    if (!host) return;
    if (plot) { plot.destroy(); plot = null; }

    const daten = ctx.store.get();
    const fenster = wAvgSerie(imZeitfenster(nachDatumSortiert(daten), filter));
    const { x, gewicht, wavg, trend } = chartSerien(fenster);

    if (x.length < 2 || !globalThis.uPlot) {
      host.innerHTML = '<p class="leer-hinweis">Noch zu wenig Daten für ein Diagramm.</p>';
      return;
    }

    // Ziel-Linie (horizontale Serie auf konstantem y), aus Profil-Zielgewicht.
    const groesse = daten.profil?.koerpergroesse_m ?? 1.75;
    const ziel = daten.profil?.ziel ?? DEFAULT_ZIEL;
    const zielKg = zielInKg(ziel, groesse);
    const zielSerie = x.map(() => zielKg);

    // Min/Max im sichtbaren Fenster (für Marker-Punkte auf der Gewichtslinie).
    const echte = gewicht.map((v, i) => [i, v]).filter(([, v]) => v != null && Number.isFinite(v));
    let idxMin = null, idxMax = null;
    if (echte.length) {
      idxMin = echte.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
      idxMax = echte.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    }

    const cLinie = farbe('var(--chart-linie)');
    const cTrendS = farbe('var(--warn)');
    const cTrend = farbe('var(--chart-trend)');
    const cGitter = farbe('var(--chart-gitter)');
    const cFg2 = farbe('var(--fg-2)');
    const cZiel = farbe('var(--gut)');
    const cFlaeche = farbe('var(--chart-flaeche)');

    const breite = Math.max(240, host.clientWidth || 320);
    // Höhe: im Vollbild die TATSÄCHLICH verfügbare Höhe der Chart-Fläche messen
    // (die per Flex die Resthöhe zwischen Leiste/Kontext oben und Chips unten einnimmt).
    // host.clientHeight abzüglich des vertikalen Paddings der Karte. Fällt der erste
    // Messwert 0/zu klein aus (Layout noch nicht stabil), greift ein Fallback.
    let hoehe;
    if (vollbild) {
      const cs = getComputedStyle(host);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const verfuegbar = host.clientHeight - padY;
      hoehe = verfuegbar > 160 ? verfuegbar : Math.max(220, (window.innerHeight || 500) - 220);
    } else {
      hoehe = Math.max(300, Math.min(420, Math.round(breite * 0.62)));
    }

    // Eigenes Tooltip-Element in der Chart-Fläche (statt der nativen uPlot-Legende).
    host.style.position = 'relative';
    let tip = host.querySelector('.ch-tooltip');
    if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tooltip'; host.appendChild(tip); }
    tip.style.display = 'none';
    const fmtKg = (v) => (v == null ? '–' : v.toFixed(1).replace('.', ',') + ' kg');
    const fmtDat = (sek) => {
      const d = new Date(sek * 1000);
      return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
    };

    // Serien-Reihenfolge: [x, gewicht, wavg, trend, ziel]
    const serien = [
      {},
      sichtbar.gewicht
        ? { label: 'Gewicht', stroke: cLinie, width: 2.5, fill: cFlaeche,
            points: { show: false },
            // Min/Max als dicke Punkte markieren.
            value: (u, v) => (v == null ? '–' : v.toFixed(1).replace('.', ',') + ' kg') }
        : { show: false, label: 'Gewicht', stroke: cLinie },
      sichtbar.wavg
        ? { label: '7-Tage Ø', stroke: cTrendS, width: 1.6, dash: [6, 4], points: { show: false },
            value: (u, v) => (v == null ? '–' : v.toFixed(1).replace('.', ',') + ' kg') }
        : { show: false, label: '7-Tage Ø', stroke: cTrendS },
      sichtbar.trend
        ? { label: 'Trend', stroke: cTrend, width: 1.6, points: { show: false },
            value: (u, v) => (v == null ? '–' : v.toFixed(1).replace('.', ',') + ' kg') }
        : { show: false, label: 'Trend', stroke: cTrend },
      sichtbar.ziel
        ? { label: 'Ziel', stroke: cZiel, width: 1.4, dash: [2, 4], points: { show: false },
            value: (u, v) => (v == null ? '–' : v.toFixed(1).replace('.', ',') + ' kg') }
        : { show: false, label: 'Ziel', stroke: cZiel },
    ];

    const opts = {
      width: breite,
      height: hoehe,
      padding: [12, 12, 4, 4],
      cursor: { points: { size: 7 } },
      legend: { show: false },
      scales: { x: { time: true }, y: { range: (u, min, max) => [min - 1, max + 1] } },
      axes: [
        { stroke: cFg2, grid: { stroke: cGitter, width: 1 }, ticks: { stroke: cGitter },
          font: '11px -apple-system, system-ui, sans-serif' },
        { stroke: cFg2, grid: { stroke: cGitter, width: 1 }, ticks: { stroke: cGitter },
          size: 44, font: '11px -apple-system, system-ui, sans-serif' },
      ],
      series: serien,
      hooks: {
        // Min/Max-Punkte auf die Gewichtslinie zeichnen (nach dem Serien-Draw).
        draw: [(u) => {
          if (!sichtbar.gewicht || idxMin == null) return;
          const ctxP = u.ctx;
          for (const [idx, isMax] of [[idxMin, false], [idxMax, true]]) {
            const cx = u.valToPos(u.data[0][idx], 'x', true);
            const cy = u.valToPos(u.data[1][idx], 'y', true);
            ctxP.save();
            ctxP.beginPath();
            ctxP.fillStyle = isMax ? cTrendS : cZiel;
            ctxP.arc(cx, cy, 4, 0, Math.PI * 2);
            ctxP.fill();
            ctxP.restore();
          }
        }],
        // Tooltip bei Cursor-Bewegung aktualisieren.
        setCursor: [(u) => {
          const i = u.cursor.idx;
          if (i == null || u.cursor.left < 0) { tip.style.display = 'none'; return; }
          const zeilen = [`<div class="ch-tip-datum">${fmtDat(u.data[0][i])}</div>`];
          if (sichtbar.gewicht) zeilen.push(`<div><span class="ch-tip-pkt" style="background:${cLinie}"></span>${fmtKg(u.data[1][i])}</div>`);
          if (sichtbar.wavg) zeilen.push(`<div><span class="ch-tip-pkt" style="background:${cTrendS}"></span>${fmtKg(u.data[2][i])}</div>`);
          if (sichtbar.trend) zeilen.push(`<div><span class="ch-tip-pkt" style="background:${cTrend}"></span>${fmtKg(u.data[3][i])}</div>`);
          tip.innerHTML = zeilen.join('');
          tip.style.display = 'block';
          // Position: am Cursor, aber innerhalb der Fläche halten.
          const lx = u.cursor.left;
          const w = tip.offsetWidth || 110;
          const links = Math.max(4, Math.min(u.over.clientWidth - w - 4, lx + 12));
          tip.style.left = links + 'px';
          tip.style.top = '10px';
        }],
      },
    };

    const data = [x, gewicht, wavg, trend, zielSerie];
    plot = new globalThis.uPlot(opts, data, host);

    // Im Vollbild ist beim synchronen Erstellen die Flex-Resthöhe evtl. noch nicht
    // final. Nach dem Layout einmal nachmessen und uPlot exakt auf die verfügbare
    // Höhe/Breite setzen → kein Overflow über die Karte, Chips bleiben erreichbar.
    if (vollbild) {
      requestAnimationFrame(() => {
        if (!plot) return;
        const cs = getComputedStyle(host);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const h = host.clientHeight - padY;
        const w = host.clientWidth - padX;
        if (h > 120 && w > 120 && (Math.abs(h - hoehe) > 2 || Math.abs(w - breite) > 2)) {
          plot.setSize({ width: w, height: h });
        }
      });
    }
  }

  function verdrahte() {
    container.querySelector('#ch-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      filter.modus = b.dataset.m; baue();
    });
    const kontext = container.querySelector('#ch-kontext');
    kontext.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.step) {
        filter.jahr = Math.max(jahrMin, Math.min(jahrMax, filter.jahr + (+b.dataset.step))); baue();
      } else if (b.dataset.tage) {
        if (b.dataset.tage === 'eigene') { if ([90, 180].includes(filter.tage)) filter.tage = 120; }
        else filter.tage = +b.dataset.tage;
        baue();
      }
    });
    const eigene = container.querySelector('#ch-eigene');
    if (eigene) {
      const input = container.querySelector('#ch-eInput');
      eigene.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-eigene]'); if (!b) return;
        filter.tage = Math.max(1, Math.min(3650, filter.tage + (+b.dataset.eigene))); baue();
      });
      input.addEventListener('change', () => {
        filter.tage = Math.max(1, Math.min(3650, parseInt(input.value, 10) || 1)); baue();
      });
    }
    container.querySelector('#ch-chips').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-serie]'); if (!b) return;
      const key = b.dataset.serie;
      // Mindestens eine Serie muss sichtbar bleiben.
      const andereAn = SERIEN.some(s => s.key !== key && sichtbar[s.key]);
      if (sichtbar[key] && !andereAn) return;
      sichtbar[key] = !sichtbar[key];
      baue();
    });
    container.querySelector('#ch-voll').addEventListener('click', () => {
      vollbild = !vollbild;
      document.body.classList.toggle('chart-vollbild', vollbild);
      baue();
    });
  }

  // Beim Drehen/Resize: Querformat → automatisch Vollbild; Plot neu dimensionieren.
  function aufResize() {
    const quer = (window.innerWidth || 0) > (window.innerHeight || 0);
    const neuVoll = quer; // Querformat erzwingt Vollbild
    if (neuVoll !== vollbild && quer) { // nur beim Wechsel INS Querformat automatisch
      vollbild = true;
      document.body.classList.toggle('chart-vollbild', true);
      baue();
      return;
    }
    if (!quer && vollbild) {
      // Zurück zu Hochformat: Vollbild NICHT zwangsweise verlassen (Nutzer kann per Icon),
      // aber Plot neu dimensionieren.
    }
    zeichnePlot();
  }
  // Resize-Listener registrieren und bei Screen-Verlassen aufräumen.
  window.addEventListener('resize', aufResize);
  // Cleanup, wenn der Screen neu gerendert wird (main.js leert #screen): wir hängen an
  // einen MutationObserver des Containers, der feuert, sobald unser Root verschwindet.
  const beobachter = new MutationObserver(() => {
    if (!container.querySelector('#charts-root')) {
      window.removeEventListener('resize', aufResize);
      document.body.classList.remove('chart-vollbild');
      if (plot) { plot.destroy(); plot = null; }
      beobachter.disconnect();
    }
  });
  beobachter.observe(container, { childList: true });

  baue();
}

const VOLLBILD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
