import { nachDatumSortiert, imZeitfenster, datenJahre } from '../db.js';
import { wAvgSerie, lineareTrend, zielInKg, DEFAULT_ZIEL } from '../calc.js';
import { datumsPicker, formatiereDatumKurz } from '../felder.js';
import { formatKurz, formatAchse, achsenGranularitaet, monatsTicksSek, jahresTicksSek, monatsLabelSichtbar, DATUM_KURZ_DEFAULT } from '../datum.js';
import { icon } from '../icons.js';
import { tooltipChips } from '../tooltip-chips.js';

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

// Feste Tage-Stufen der Pills; "+" (eigene) gilt als aktiv, wenn filter.tage keine davon ist.
const TAGE_STUFEN = [30, 60, 90, 180];

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
  const filter = { modus: 'gesamt', jahr: jahrMax, tage: 90, von: null, bis: null };
  const sichtbar = { gewicht: true, wavg: true, trend: false, ziel: false };
  let vollbild = false;
  let plot = null;
  let segObserver = null;
  // Von/Bis-Picker-Instanzen (nur im Zeitraum-Modus gerendert).
  let vonPicker = null, bisPicker = null;

  // Erster/letzter Datenpunkt der sortierten Gesamtdaten (für Zeitraum-Grenzen).
  function datenGrenzen() {
    const alle = nachDatumSortiert(ctx.store.get());
    if (!alle.length) return null;
    return { erster: alle[0].datum, letzter: alle[alle.length - 1].datum };
  }

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
      const istEigene = !TAGE_STUFEN.includes(filter.tage);
      const pills = TAGE_STUFEN.map(n =>
        `<button class="tp ${filter.tage === n ? 'aktiv' : ''}" data-tage="${n}">${n}</button>`
      ).join('');
      return `<span class="tage-pills">${pills}<button class="tp ${istEigene ? 'aktiv' : ''}" data-tage="eigene">+</button></span>`;
    }
    if (filter.modus === 'zeitraum') {
      return `<span class="zeitraum-pills">
        <span class="zr-feld"><label>Von</label><span id="ch-zr-von"></span></span>
        <span class="zr-feld"><label>Bis</label><span id="ch-zr-bis"></span></span></span>`;
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
            <button data-m="zeitraum" class="${filter.modus === 'zeitraum' ? 'aktiv' : ''}">Zeitraum</button>
          </div>
          <button class="ch-voll" id="ch-voll" aria-label="${vollbild ? 'Vollbild verlassen' : 'Vollbild'}">
            ${vollbild ? icon('x') : VOLLBILD_ICON}
          </button>
        </div>
        <div class="charts-kontext-zeile" id="ch-kontext" ${kontextHtml() ? '' : 'hidden'}>${kontextHtml()}</div>
        <div class="eigene-feld ${filter.modus === 'tage' && !TAGE_STUFEN.includes(filter.tage) ? 'auf' : ''}" id="ch-eigene">
          <label>Anzahl Tage</label>
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
    bauVonBisPicker();
    zeichnePlot();
    verdrahte();
    beobachteSeg();
  }

  // Rendert im Zeitraum-Modus die Von/Bis-Rädchen-Picker und erzwingt die Grenzen.
  function bauVonBisPicker() {
    vonPicker = null; bisPicker = null;
    if (filter.modus !== 'zeitraum') return;
    const g = datenGrenzen();
    if (!g) return;
    const hostVon = container.querySelector('#ch-zr-von');
    const hostBis = container.querySelector('#ch-zr-bis');
    if (!hostVon || !hostBis) return;
    vonPicker = datumsPicker(hostVon, filter.von, (iso) => {
      // Von clampen: nicht vor erstem Datenpunkt, nicht nach Bis.
      let v = iso < g.erster ? g.erster : iso;
      if (v > filter.bis) v = filter.bis;
      filter.von = v;
      if (v !== iso) vonPicker.setWert(v);
      zeichnePlot();
    }, formatiereDatumKurz);
    bisPicker = datumsPicker(hostBis, filter.bis, (iso) => {
      // Bis clampen: nicht nach letztem Datenpunkt, nicht vor Von.
      let v = iso > g.letzter ? g.letzter : iso;
      if (v < filter.von) v = filter.von;
      filter.bis = v;
      if (v !== iso) bisPicker.setWert(v);
      zeichnePlot();
    }, formatiereDatumKurz);

    // Von/Bis gemeinsam auf/zu: Ein Klick auf EINE Anzeige toggelt BEIDE Picker
    // synchron (sonst müsste man zum Einstellen des Zeitraums zweimal tippen).
    // Der interne Einzel-Toggle des datumsPicker würde gegenläufig arbeiten → wir
    // fangen den Klick in der Capture-Phase ab, stoppen ihn und steuern beide zentral.
    const anzeigen = [hostVon, hostBis].map(h => h.querySelector('.datum-anzeige'));
    const picker = [hostVon, hostBis].map(h => h.querySelector('.datum-picker'));
    function toggleBeide() {
      const öffnen = !picker[0].classList.contains('offen');
      picker.forEach(p => p.classList.toggle('offen', öffnen));
      if (öffnen) {
        // Gewählte Räder zentrieren (wie im Einzel-Picker).
        [hostVon, hostBis].forEach(h =>
          h.querySelectorAll('.rad-item.sel').forEach(x => x.scrollIntoView({ block: 'center' })));
      }
    }
    anzeigen.forEach(a => a && a.addEventListener('click', (e) => {
      e.stopPropagation();        // internen Einzel-Toggle des datumsPicker unterbinden
      toggleBeide();
    }, true));                    // Capture-Phase: vor dem picker-eigenen Handler
  }

  function zeichnePlot() {
    const host = container.querySelector('#ch-plot');
    if (!host) return;
    if (plot) { plot.destroy(); plot = null; }

    const daten = ctx.store.get();
    const kurzFmt = (daten.profil && daten.profil.datum_kurz) || DATUM_KURZ_DEFAULT;
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
      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      return formatKurz(iso, kurzFmt);
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
          font: '11px -apple-system, system-ui, sans-serif',
          // Eigene Tick-Positionen (uPlot v1.6.31 splits-Signatur:
          // (self, axisIdx, scaleMin, scaleMax, foundIncr, foundSpace)).
          // Bei Monats-Granularitaet erzwingen wir GENAU einen Tick je Monat
          // (Monatserster 00:00 UTC) — sonst setzt uPlot mehrere Ticks im selben
          // Monat und die values-Closure labelt denselben Monatsnamen mehrfach.
          // Fuer Tag-/Jahr-Granularitaet hat uPlot v1.6.31 keine oeffentliche
          // Moeglichkeit, die eingebauten Default-Ticks aus dem splits-Callback
          // heraus abzurufen (der Default-Generator ist nicht exportiert und
          // wird durch unseren Callback ersetzt). Wir bilden daher die uPlot-
          // Default-Logik fuer diese Faelle nach: ab einem auf Tagesgrenze
          // abgerundeten Start in foundIncr-Schritten bis scaleMax — identisch
          // zu uPlots nicht-Monats-Zweig. (Monats-/Jahr-Snapping uebernimmt die
          // monatsTicksSek-Funktion bzw. der Tagesraster deckt den Rest ab.)
          splits: (u, axisIdx, scaleMin, scaleMax, foundIncr) => {
            const spanne = (u.scales.x.max - u.scales.x.min); // Sekunden
            const gran = achsenGranularitaet(spanne);
            if (gran === 'monat') {
              return monatsTicksSek(u.scales.x.min, u.scales.x.max);
            }
            if (gran === 'jahr') {
              // Je EIN Tick pro Jahr (Jahreserster) — sonst labelt uPlot dieselbe
              // Jahreszahl mehrfach (2023·2023·2024…).
              return jahresTicksSek(u.scales.x.min, u.scales.x.max);
            }
            // Nicht-Monats-Fall: uPlot-Default nachbilden (Schritt = foundIncr),
            // Start auf UTC-Tagesgrenze <= scaleMin, dann hoch bis scaleMax.
            const TAG_S = 86400;
            const ticks = [];
            let s = Math.floor(scaleMin / TAG_S) * TAG_S;
            // ersten Tick >= scaleMin ausrichten
            while (s < scaleMin) s += foundIncr;
            for (; s <= scaleMax; s += foundIncr) ticks.push(s);
            return ticks;
          },
          values: (u, splits) => {
            const spanne = (u.scales.x.max - u.scales.x.min); // Sekunden
            const gran = achsenGranularitaet(spanne);
            // Bei Tag-/Monatsansicht das Jahr als ZWEITE Zeile (uPlot rendert '\n' zweizeilig).
            // Jahr nur am ersten Tick + bei Jahreswechsel, sonst zweite Zeile leer.
            // WICHTIG: zweite Zeile IMMER anhängen ('\n') — auch leer —, damit alle
            // Labels gleich hoch sind und uPlot konsistent Platz für Zeile 2 reserviert.
            // Bei gran==='jahr' steht das Jahr ohnehin schon in Zeile 1 → keine zweite Zeile.
            // AUSDUENNUNG (nur Monat, >12 Ticks): jeder zweite Tick ohne Monatsname in
            // Zeile 1 — aber die Jahr-Zweitzeile bleibt an Jahreswechsel-Ticks IMMER
            // erhalten (auch wenn ausgeduennt), sonst verschwaende die Jahresmarke.
            // Der erste Tick ist nie ausgeduennt (monatsLabelSichtbar startet bei Index 0).
            let letztesJahr = null;
            return splits.map((s, i) => {
              const oben = formatAchse(s, gran, kurzFmt);
              if (gran === 'jahr') return oben; // Jahr steht schon oben
              const jahr = new Date(s * 1000).getUTCFullYear(); // UTC, wie im Rest der Datei
              const zeigeJahr = i === 0 || jahr !== letztesJahr;
              letztesJahr = jahr;
              // Monats-Label ggf. ausduennen (nur Zeile 1 leeren, Tick bleibt).
              const zeile1 = (gran === 'monat' && !monatsLabelSichtbar(i, splits.length)) ? '' : oben;
              return zeigeJahr ? `${zeile1}\n${jahr}` : `${zeile1}\n`;
            });
          } },
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
          // Ereignisse/Medikamente des Tages als Chips (gleiche Farbgebung wie Verlauf).
          const dTag = new Date(u.data[0][i] * 1000);
          const isoTag = `${dTag.getUTCFullYear()}-${String(dTag.getUTCMonth()+1).padStart(2,'0')}-${String(dTag.getUTCDate()).padStart(2,'0')}`;
          const spTag = (daten.tageseintraege[isoTag] || {}).spritze || null;
          const chipsData = tooltipChips(daten.ereignisse, spTag, isoTag);
          if (chipsData.length) {
            const chipHtml = chipsData.map(c => c.typ === 'ev'
              ? `<span class="chip ev">${icon('kalender')}${c.label}</span>`
              : `<span class="chip med">${icon('pille')}${c.label}</span>`).join('');
            zeilen.push(`<div class="ch-tip-chips">${chipHtml}</div>`);
          }
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

    // Touch-Interaktion in der NORMALANSICHT: uPlot v1.6.31 hat keinen Touch-Support, der
    // Tooltip/Cursor liegt auf dem echten Gerät daneben (positionsabhängiger Versatz, u.a.
    // wegen UI-Zoom). Zwei Fix-Versuche am echten Android gescheitert → Workaround: Ein
    // sauberer TAP auf die Chart-Fläche öffnet den Vollbild-Modus, wo Cursor + Scrubbing
    // nachweislich korrekt sind. „Sauber" = kurz getippt, kaum bewegt → ein vertikaler
    // Scroll-Wisch oder langes Halten öffnet NICHT versehentlich Vollbild.
    if (!vollbild) {
      const tapZiel = host.querySelector('.u-over') || host;
      let sx = 0, sy = 0, st = 0, verworfen = false;
      // Capture-Phase: uPlot könnte Touch-Events in der Bubble-Phase abfangen → wir hören
      // vorher mit (capture:true). passive:true, da wir nichts preventDefaulten (Scrollen bleibt).
      tapZiel.addEventListener('touchstart', (ev) => {
        if (!ev.touches || ev.touches.length !== 1) { verworfen = true; return; }
        const t = ev.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); verworfen = false;
      }, { passive: true, capture: true });
      tapZiel.addEventListener('touchmove', (ev) => {
        const t = ev.touches && ev.touches[0]; if (!t) return;
        if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) verworfen = true;
      }, { passive: true, capture: true });
      tapZiel.addEventListener('touchend', () => {
        if (verworfen || Date.now() - st > 400) return;  // Wisch/Halten → kein Vollbild
        vollbild = true;
        document.body.classList.toggle('chart-vollbild', true);
        baue();
      }, { passive: true, capture: true });
    } else {
      // Touch-Cursor NUR im Vollbild: uPlot v1.6.31 kennt keine Touch-Events → der Finger
      // bewegt die Auswahl sonst nicht (kein Scrubbing). Eigener Handler über die uPlot-API
      // plot.setCursor: Finger-Position frisch relativ zur Zeichenfläche rechnen → Position
      // korrekt UND Ziehen folgt dem Finger. (Im Vollbild vom Nutzer als korrekt bestätigt;
      // die Zoom-Skala-Korrektur offsetWidth/rect.width ist dort i.d.R. 1, schadet aber nicht.)
      const over = host.querySelector('.u-over');
      if (over) {
        const ausTouch = (ev) => {
          if (!plot || !ev.touches || ev.touches.length === 0) return;
          const t = ev.touches[0];
          const rect = over.getBoundingClientRect();
          const skala = rect.width ? over.offsetWidth / rect.width : 1;
          const left = (t.clientX - rect.left) * skala;
          const top = (t.clientY - rect.top) * skala;
          if (left < 0 || left > over.offsetWidth) { plot.setCursor({ left: -10, top: -10 }); return; }
          ev.preventDefault();
          plot.setCursor({ left, top });
        };
        over.addEventListener('touchstart', ausTouch, { passive: false });
        over.addEventListener('touchmove', ausTouch, { passive: false });
      }
    }
  }

  // Segmented-Control dynamisch grau (kompakt/einzeilig) vs. blau (Umbruch).
  // Mess-Trick: Im Nicht-kompakt-Zustand ist flex-wrap:wrap erlaubt. Wir prüfen, ob
  // die Buttons in EINER Zeile Platz hätten, indem wir ihre Breiten summieren und mit
  // der verfügbaren Leistenbreite vergleichen. Passen alle → seg-kompakt (grau),
  // sonst Klasse entfernen (blaue Umrandung, darf umbrechen).
  function beobachteSeg() {
    if (segObserver) { segObserver.disconnect(); segObserver = null; }
    const seg = container.querySelector('#ch-seg');
    if (!seg || typeof ResizeObserver === 'undefined') return;
    const messen = () => {
      // Temporär kompakt entfernen, um die natürliche (umbrechbare) Breite zu messen.
      seg.classList.remove('seg-kompakt');
      const buttons = [...seg.children];
      if (!buttons.length) return;
      const styles = getComputedStyle(seg);
      const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
      let summe = 0;
      for (const b of buttons) summe += b.offsetWidth;
      summe += gap * (buttons.length - 1);
      // Passt alles einzeilig in die verfügbare Breite? → grau/kompakt.
      const passt = summe <= seg.clientWidth + 0.5;
      seg.classList.toggle('seg-kompakt', passt);
    };
    messen();
    segObserver = new ResizeObserver(messen);
    // Die Leiste (Elternbreite) bestimmt den verfügbaren Platz.
    const leiste = seg.closest('.charts-leiste') || seg;
    segObserver.observe(leiste);
  }

  function verdrahte() {
    container.querySelector('#ch-seg').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      filter.modus = b.dataset.m;
      // Beim ersten Wechsel auf "zeitraum" Von/Bis mit erstem/letztem Datenpunkt vorbelegen.
      if (filter.modus === 'zeitraum') {
        const g = datenGrenzen();
        if (g) {
          if (!filter.von || filter.von < g.erster || filter.von > g.letzter) filter.von = g.erster;
          if (!filter.bis || filter.bis > g.letzter || filter.bis < g.erster) filter.bis = g.letzter;
        }
      }
      baue();
    });
    const kontext = container.querySelector('#ch-kontext');
    kontext.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.step) {
        filter.jahr = Math.max(jahrMin, Math.min(jahrMax, filter.jahr + (+b.dataset.step))); baue();
      } else if (b.dataset.tage) {
        if (b.dataset.tage === 'eigene') { if (TAGE_STUFEN.includes(filter.tage)) filter.tage = 120; }
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
      if (segObserver) { segObserver.disconnect(); segObserver = null; }
      beobachter.disconnect();
    }
  });
  beobachter.observe(container, { childList: true });

  baue();
}

const VOLLBILD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
