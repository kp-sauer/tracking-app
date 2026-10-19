import { baueExport, pruefeImport, wendeImportAn } from '../backup.js';
import { geschlechtSegment, datumsPicker } from '../felder.js';
import { effektiveSkala, SKALA_STUFEN } from '../theme.js';
import { alter, zielInKg, zielInBmi, DEFAULT_ZIEL } from '../calc.js';
import { nachDatumSortiert } from '../db.js';
import { icon } from '../icons.js';

const WELT_LABEL = { test: 'TEST', produktiv: 'PROD' };

export function renderProfil(container, ctx) {
  const daten = ctx.store.get();
  const p = daten.profil ?? { koerpergroesse_m: 1.75, geschlecht: 'm', geburtsdatum: '', theme: 'system' };
  const anzahlTage = nachDatumSortiert(daten).length;
  const letztesBackup = daten.letztes_backup
    ? new Date(daten.letztes_backup).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    : '–';
  const heute = new Date().toISOString().slice(0, 10);
  const alterText = p.geburtsdatum ? `${alter(p.geburtsdatum, heute)} Jahre` : '–';

  container.innerHTML = `
    <section class="karte info">
      <div class="zelle"><div class="z-wert ${ctx.welt === 'test' ? 'welt-test' : ''}">${WELT_LABEL[ctx.welt] ?? ctx.welt}</div><div class="z-label">Umgebung</div></div>
      <div class="zelle"><div class="z-wert">${anzahlTage}</div><div class="z-label">Erfasste Tage</div></div>
      <div class="zelle"><div class="z-wert">${letztesBackup}</div><div class="z-label">Letztes Backup</div></div>
    </section>

    <div class="abschnitt">Stammdaten</div>
    <section class="karte">
      <div class="zeile"><label>Körpergröße</label><div class="ctrl"><input id="pr-groesse" type="number" step="0.01" min="1" max="2.5" value="${p.koerpergroesse_m}"> m</div></div>
      <div class="zeile"><label>Geschlecht</label><div class="ctrl"><span id="pr-geschlecht"></span></div></div>
      <div class="zeile zeile-datum"><label>Geburtsdatum</label><div class="ctrl"><span id="pr-geburt"></span></div></div>
      <div class="zeile"><label>Alter</label><div class="ctrl"><span class="readonly" id="pr-alter">${alterText}</span></div></div>
    </section>
    <div style="margin-top:var(--sp-4)"><button type="button" id="pr-speichern" class="btn primär" style="width:100%">Stammdaten speichern</button></div>
    <div class="pr-toast" id="pr-toast"></div>

    <div class="abschnitt">Ziel</div>
    <section class="karte">
      <div class="zeile"><label>Zielgewicht</label></div>
      <div class="zeile ziel-eingabe"><div class="ctrl ctrl-ziel"><span id="pr-ziel-typ"></span><span id="pr-ziel-feld"></span><span class="ziel-abgeleitet" id="pr-ziel-abgeleitet"></span></div></div>
      <div class="zeile"><label>Zwischenziel 1</label><div class="ctrl"><span id="pr-zw1-an"></span></div></div>
      <div class="zeile ziel-eingabe" id="pr-zw1-zeile" hidden><div class="ctrl ctrl-ziel"><span id="pr-zw1-typ"></span><span id="pr-zw1-feld"></span><span class="ziel-abgeleitet" id="pr-zw1-abgeleitet"></span></div></div>
      <div class="zeile"><label>Zwischenziel 2</label><div class="ctrl"><span id="pr-zw2-an"></span></div></div>
      <div class="zeile ziel-eingabe" id="pr-zw2-zeile" hidden><div class="ctrl ctrl-ziel"><span id="pr-zw2-typ"></span><span id="pr-zw2-feld"></span><span class="ziel-abgeleitet" id="pr-zw2-abgeleitet"></span></div></div>
      <div class="zeile"><label>Zwischenziel 3</label><div class="ctrl"><span id="pr-zw3-an"></span></div></div>
      <div class="zeile ziel-eingabe" id="pr-zw3-zeile" hidden><div class="ctrl ctrl-ziel"><span id="pr-zw3-typ"></span><span id="pr-zw3-feld"></span><span class="ziel-abgeleitet" id="pr-zw3-abgeleitet"></span></div></div>
      <div class="zeile zw-info"><span class="erkl">Wird automatisch übernommen. Feste BMI-Schwellen (30/35/40) erscheinen als Marker auf der Übersicht.</span></div>
    </section>

    <div class="abschnitt">Darstellung</div>
    <section class="karte">
      <div class="zeile"><label>Design</label><div class="ctrl"><span id="pr-theme"></span></div></div>
      <div class="zeile"><label>Größe</label><div class="ctrl"><span id="pr-skala"></span></div></div>
    </section>

    <div class="abschnitt">Backup &amp; Daten</div>
    <section class="karte"><div class="backup-pad">
      <p class="erkl">Sichere deine Daten als JSON-Datei oder stelle sie wieder her. Der Import prüft automatisch, ob die Datei zu dieser Umgebung (${WELT_LABEL[ctx.welt] ?? ctx.welt}) gehört.</p>
      <div class="btn-reihe">
        <button type="button" id="pr-export" class="btn primär">Export</button>
        <button type="button" id="pr-import-btn" class="btn">Import</button>
        <input id="pr-import" type="file" accept=".json,application/json,text/json,text/plain" hidden>
      </div>
      <p class="status" id="pr-status" role="status" hidden></p>
    </div></section>`;

  // Komponenten initialisieren
  const geschlecht = geschlechtSegment(container.querySelector('#pr-geschlecht'), p.geschlecht);
  const datum = datumsPicker(container.querySelector('#pr-geburt'), p.geburtsdatum || '1990-01-01');

  // Theme als Segmented-Control — wirkt sofort live & speichert sofort (wie der Kopf-Toggle).
  const themeHost = container.querySelector('#pr-theme');
  const THEME_OPT = [['system','System'],['hell','Hell'],['dunkel','Dunkel']];
  const themeWahl = ['system','hell','dunkel'].includes(p.theme) ? p.theme : 'system';
  const seg = document.createElement('div'); seg.className = 'seg';
  for (const [v,label] of THEME_OPT) {
    const b = document.createElement('button'); b.type='button'; b.textContent=label; b.dataset.v=v;
    if (v===themeWahl) b.classList.add('aktiv');
    b.addEventListener('click', () => {
      for (const k of seg.children) k.classList.toggle('aktiv', k.dataset.v===v);
      ctx.store.aktualisiere(d => ({ ...d, profil: { ...(d.profil ?? {}), theme: v } }), { undobar: false });
    });
    seg.appendChild(b);
  }
  themeHost.appendChild(seg);

  // Anzeigegröße als Segmented-Control mit A-Größen — ebenfalls sofort live & speichernd.
  const skalaHost = container.querySelector('#pr-skala');
  const aktiveSkala = effektiveSkala(p.anzeige_skala);
  const A_GROESSE = { 90:11, 100:13, 110:15, 120:18, 130:22 }; // Pixelgröße des „A" je Stufe
  const skalaSeg = document.createElement('div'); skalaSeg.className = 'seg seg-ikon';
  for (const stufe of SKALA_STUFEN) {
    const b = document.createElement('button'); b.type='button'; b.dataset.p = String(stufe);
    b.setAttribute('aria-label', stufe + ' Prozent');
    b.innerHTML = `<span class="aa" style="font-size:${A_GROESSE[stufe]}px">A</span>`;
    if (stufe===aktiveSkala) b.classList.add('aktiv');
    b.addEventListener('click', () => {
      for (const k of skalaSeg.children) k.classList.toggle('aktiv', k.dataset.p===String(stufe));
      ctx.store.aktualisiere(d => ({ ...d, profil: { ...(d.profil ?? {}), anzeige_skala: stufe } }), { undobar: false });
    });
    skalaSeg.appendChild(b);
  }
  skalaHost.appendChild(skalaSeg);

  // ---- Ziel + Zwischenziel (auto-live, wie Darstellung) ----
  const groesse = parseFloat(p.koerpergroesse_m) || 1.75;
  const r1 = (x) => x.toFixed(1).replace('.', ',');

  // Baut einen Ziel-Editor (Typ-Segmented BMI/kg + Zahlenfeld −/+ + abgeleitete Anzeige).
  // feld = 'ziel' | 'zwischenziel'. onChange(zielObjekt|null) speichert live.
  function zielEditor(typHost, feldHost, abgeleitetHost, start, onChange) {
    let ziel = { typ: start?.typ === 'kg' ? 'kg' : 'bmi', wert: Number(start?.wert) || (start?.typ === 'kg' ? 76 : 25) };

    function schritt() { return ziel.typ === 'bmi' ? 0.5 : 0.1; }
    function grenzen() { return ziel.typ === 'bmi' ? [15, 50] : [30, 250]; }
    function klemme(w) { const [lo, hi] = grenzen(); return Math.max(lo, Math.min(hi, w)); }

    function zeichneAbgeleitet() {
      const kg = zielInKg(ziel, groesse), b = zielInBmi(ziel, groesse);
      abgeleitetHost.textContent = ziel.typ === 'bmi' ? `≙ ${r1(kg)} kg` : `≙ BMI ${r1(b)}`;
    }

    // Typ-Segmented
    const typSeg = document.createElement('div'); typSeg.className = 'seg seg-kompakt';
    for (const [v, label] of [['bmi', 'BMI'], ['kg', 'kg']]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.v = v;
      if (v === ziel.typ) b.classList.add('aktiv');
      b.addEventListener('click', () => {
        if (ziel.typ === v) return;
        // Wert beim Umschalten sinnvoll übernehmen (umrechnen), damit kein Sprung entsteht.
        ziel = v === 'kg'
          ? { typ: 'kg', wert: +zielInKg(ziel, groesse).toFixed(1) }
          : { typ: 'bmi', wert: +zielInBmi(ziel, groesse).toFixed(1) };
        for (const k of typSeg.children) k.classList.toggle('aktiv', k.dataset.v === v);
        input.value = ziel.wert; zeichneAbgeleitet(); onChange(ziel);
      });
      typSeg.appendChild(b);
    }
    typHost.appendChild(typSeg);

    // Zahlenfeld mit −/+
    const num = document.createElement('span'); num.className = 'num';
    const minus = document.createElement('button'); minus.type = 'button'; minus.innerHTML = icon('minus');
    const input = document.createElement('input'); input.type = 'number'; input.value = ziel.wert; input.step = String(schritt());
    const plus = document.createElement('button'); plus.type = 'button'; plus.innerHTML = icon('plus');
    num.append(minus, input, plus);
    feldHost.appendChild(num);

    function setze(w) { ziel = { ...ziel, wert: +klemme(w).toFixed(1) }; input.value = ziel.wert; zeichneAbgeleitet(); onChange(ziel); }
    minus.addEventListener('click', () => setze(ziel.wert - schritt()));
    plus.addEventListener('click', () => setze(ziel.wert + schritt()));
    input.addEventListener('change', () => setze(parseFloat(input.value) || ziel.wert));

    zeichneAbgeleitet();
    return () => ziel;
  }

  // Hauptziel
  zielEditor(
    container.querySelector('#pr-ziel-typ'),
    container.querySelector('#pr-ziel-feld'),
    container.querySelector('#pr-ziel-abgeleitet'),
    p.ziel ?? DEFAULT_ZIEL,
    (ziel) => ctx.store.aktualisiere(d => ({ ...d, profil: { ...(d.profil ?? {}), ziel } }), { undobar: false }),
  );

  // Zwischenziele als Array (0–3). Migriert ein altes einzelnes `zwischenziel`.
  const zwStart = Array.isArray(p.zwischenziele)
    ? p.zwischenziele
    : (p.zwischenziel ? [p.zwischenziel] : []);
  const ZW_DEFAULT = [{ typ: 'bmi', wert: 30 }, { typ: 'bmi', wert: 27 }, { typ: 'bmi', wert: 24 }];

  // Schreibt das Zwischenziel an Index idx (oder entfernt es) und speichert das kompakte Array.
  function speichereZw(idx, ziel /* oder null zum Entfernen */) {
    ctx.store.aktualisiere(d => {
      const pr = { ...(d.profil ?? {}) };
      const arr = Array.isArray(pr.zwischenziele) ? [...pr.zwischenziele] : (pr.zwischenziel ? [pr.zwischenziel] : []);
      if (ziel) arr[idx] = ziel; else arr[idx] = null;
      pr.zwischenziele = arr.filter(Boolean); // kompakt, keine Lücken
      delete pr.zwischenziel;                  // altes Einzelfeld entfernen (migriert)
      return { ...d, profil: pr };
    }, { undobar: false });
  }

  // Baut eine Zwischenziel-Steuerung (An/Aus + Editor) für Slot 0 oder 1.
  function zwischenzielSlot(idx, anHostId, zeileId, typId, feldId, abgId) {
    const anHost = container.querySelector(anHostId);
    const zeile = container.querySelector(zeileId);
    const anSeg = document.createElement('div'); anSeg.className = 'seg seg-kompakt';
    let aktiv = !!zwStart[idx];
    let leseZiel = null;

    function initEditor() {
      leseZiel = zielEditor(
        container.querySelector(typId), container.querySelector(feldId), container.querySelector(abgId),
        zwStart[idx] ?? ZW_DEFAULT[idx],
        (ziel) => speichereZw(idx, ziel),
      );
    }

    for (const [v, label] of [['aus', 'Aus'], ['an', 'An']]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.v = v;
      if ((v === 'an') === aktiv) b.classList.add('aktiv');
      b.addEventListener('click', () => {
        aktiv = v === 'an';
        for (const k of anSeg.children) k.classList.toggle('aktiv', (k.dataset.v === 'an') === aktiv);
        zeile.hidden = !aktiv;
        if (!aktiv) speichereZw(idx, null);
        else { if (!leseZiel) initEditor(); speichereZw(idx, leseZiel()); }
      });
      anSeg.appendChild(b);
    }
    anHost.appendChild(anSeg);
    if (aktiv) { zeile.hidden = false; initEditor(); }
  }

  // Slot 1 steuert Array-Index 0, Slot 2 → Index 1, Slot 3 → Index 2.
  zwischenzielSlot(0, '#pr-zw1-an', '#pr-zw1-zeile', '#pr-zw1-typ', '#pr-zw1-feld', '#pr-zw1-abgeleitet');
  zwischenzielSlot(1, '#pr-zw2-an', '#pr-zw2-zeile', '#pr-zw2-typ', '#pr-zw2-feld', '#pr-zw2-abgeleitet');
  zwischenzielSlot(2, '#pr-zw3-an', '#pr-zw3-zeile', '#pr-zw3-typ', '#pr-zw3-feld', '#pr-zw3-abgeleitet');

  // Alter live aktualisieren, wenn Datum geändert wird
  const datumHost = container.querySelector('#pr-geburt');
  datumHost.addEventListener('click', () => {
    const iso = datum.getWert();
    container.querySelector('#pr-alter').textContent = iso ? `${alter(iso, heute)} Jahre` : '–';
  });

  function zeigeStatus(text) {
    const s = container.querySelector('#pr-status');
    s.textContent = text; s.hidden = false;
  }

  function zeigeToast(text) {
    const t = container.querySelector('#pr-toast');
    t.textContent = text;
    t.classList.add('auf');
    setTimeout(() => t.classList.remove('auf'), 2200);
  }

  // Stammdaten speichern — Darstellung (theme, anzeige_skala) wird NICHT angefasst,
  // die speichert der jeweilige Schalter bereits live. Daher Merge statt Neuaufbau.
  container.querySelector('#pr-speichern').addEventListener('click', async () => {
    const stammdaten = {
      koerpergroesse_m: parseFloat(container.querySelector('#pr-groesse').value),
      geschlecht: geschlecht.getWert(),
      geburtsdatum: datum.getWert(),
    };
    await ctx.store.aktualisiere(d => ({ ...d, profil: { ...(d.profil ?? {}), ...stammdaten } }), { undobar: false });
    zeigeToast('Stammdaten gespeichert');
  });

  // Export
  container.querySelector('#pr-export').addEventListener('click', async () => {
    const exp = baueExport(ctx.store.get());
    const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' });
    const name = `backup_${exp.welt}_${new Date().toISOString().slice(0,10)}.json`;
    const datei = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [datei] })) {
      try { await navigator.share({ files: [datei] }); await ctx.store.aktualisiere(d => ({ ...d, letztes_backup: new Date().toISOString() }), { undobar: false }); return; } catch { /* Download-Fallback */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
    await ctx.store.aktualisiere(d => ({ ...d, letztes_backup: new Date().toISOString() }), { undobar: false });
  });

  // Import: Button triggert das versteckte File-Input
  container.querySelector('#pr-import-btn').addEventListener('click', () => container.querySelector('#pr-import').click());
  container.querySelector('#pr-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    let dateiObj;
    try { dateiObj = JSON.parse(await file.text()); }
    catch { zeigeStatus('Fehler: keine gültige JSON-Datei.'); return; }
    const pruefung = pruefeImport(dateiObj, ctx.welt);
    if (!pruefung.ok) {
      const texte = {
        welt_mismatch: `BLOCKIERT: Diese Datei gehört zur Welt „${dateiObj.welt}", du bist in „${ctx.welt}". Import verweigert.`,
        schema_version: 'BLOCKIERT: inkompatible Schema-Version.',
        struktur: 'BLOCKIERT: unerwartetes Dateiformat.',
      };
      zeigeStatus(texte[pruefung.grund] ?? 'BLOCKIERT.');
      e.target.value = ''; return;
    }
    const modus = globalThis.confirm?.('OK = Ersetzen (Bestand verwerfen), Abbrechen = Zusammenführen (Merge)') ? 'ersetzen' : 'merge';
    await ctx.store.aktualisiere(d => wendeImportAn(d, dateiObj, modus), { undobar: false });
    ctx.store.leereHistorie(); // Import ist kein undobarer Schritt → Historie verwerfen
    zeigeStatus(`Import erfolgreich (${modus}).`);
    e.target.value = '';
  });
}
