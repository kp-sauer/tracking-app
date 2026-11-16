import { nachDatumSortiert, entferneTageseintrag, gruppiereNachMonat, vortagesDifferenzen, datenJahre, dosisIndex } from '../db.js';
import { ereignisseAmTag, aktualisiereEreignis, entferneEreignis } from '../ereignisse.js';
import { MONATE, formatiereDatum, formatiereDatumKurz, datumsPicker } from '../felder.js';
import { EINGABE_KATEGORIEN, istEingabeKategorie, PRAEPARATE, DOSIS_LISTE } from '../schema.js';
import { icon } from '../icons.js';
import { heuteLokal } from '../calc.js';
import { istStrukturierteSpritze, setzeSpritze, entferneSpritze } from '../spritze.js';

const WTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

// Kategorie-Labels für die Ereignis-Chips. 'sport' = Alt-Kategorie (nicht mehr im
// Eingabe-UI, aber in Altdaten möglich) → als 'Sport' anzeigen.
const KAT_LABEL = {
  urlaub: 'Urlaub', feiertag_fest: 'Fest', krankheit: 'Krankheit',
  wiesn: 'Wiesn', sonstiges: 'Sonst', sport: 'Sport',
};

const fmtKg = (n) => n.toFixed(1).replace('.', ',');
// Vortages-Differenz: echtes Minuszeichen, immer eine Nachkommastelle, "kg".
function fmtDiff(n) {
  const vz = n > 0 ? '+' : '−';
  return vz + Math.abs(n).toFixed(1).replace('.', ',') + ' kg';
}

// Wochentag-Kürzel aus ISO (UTC-basiert, zeitzonensicher).
function wochentag(iso) {
  const [j, m, t] = iso.split('-').map(Number);
  return WTAG[new Date(Date.UTC(j, m - 1, t)).getUTCDay()];
}
// Tagnummer (ohne führende Null) aus ISO.
function tagNr(iso) { return Number(iso.split('-')[2]); }

// Medikament-Chip-Text: "<Präparat> <Dosis> mg" bzw. historie_rohtext, wenn keine Dosis.
function medText(spritze) {
  if (spritze.dosis_mg != null) return `${spritze.praeparat} ${fmtKg(spritze.dosis_mg)} mg`;
  return spritze.historie_rohtext || spritze.praeparat;
}

export function renderVerlauf(container, ctx) {
  // Jahr-Filter-Zustand: 'alle' oder eine Jahreszahl. Bei Jahr-Klick wird baue()
  // erneut aufgerufen (analog dashboard.js/charts.js), das HTML + Events neu setzt.
  let jahrFilter = 'alle';

  function baue() {
  const daten = ctx.store.get();
  const aufsteigend = nachDatumSortiert(daten);     // chronologisch (für Differenzen)
  const diffs = vortagesDifferenzen(aufsteigend);   // auf GESAMTdaten, nie filtern
  const absteigend = [...aufsteigend].reverse();    // neueste zuerst (Anzeige)
  const heute = heuteLokal();

  if (absteigend.length === 0) {
    container.innerHTML = `<div class="verlauf-leer">Noch keine Einträge.</div>`;
    return;
  }

  // Jahr-Leiste: "Alle" + Datenjahre ABSTEIGEND (neueste zuerst).
  const jahre = datenJahre(daten).reverse();
  const jahrBtns = [`<button data-jahr="alle"${jahrFilter === 'alle' ? ' class="aktiv"' : ''}>Alle</button>`]
    .concat(jahre.map(j => `<button data-jahr="${j}"${String(jahrFilter) === String(j) ? ' class="aktiv"' : ''}>${j}</button>`))
    .join('');
  const jahrLeisteHtml = `<div class="jahr-leiste">${jahrBtns}</div>`;

  // Nur die ANZEIGE filtern (Differenzen bleiben auf den Gesamtdaten berechnet).
  const anzeige = jahrFilter === 'alle'
    ? absteigend
    : absteigend.filter(t => t.datum.slice(0, 4) === String(jahrFilter));

  const gruppen = gruppiereNachMonat(anzeige);
  const html = gruppen.map(g => {
    const anzahl = g.tage.length;
    const zusatz = anzahl === 1 ? '1 Eintrag' : `${anzahl} Einträge`;
    const zeilen = g.tage.map(t => {
      const istHeute = t.datum === heute;
      const diff = diffs[t.datum];
      const diffCls = diff == null ? '' : (diff < 0 ? 'ab' : (diff > 0 ? 'zu' : ''));
      const diffHtml = (diff != null && diff !== 0)
        ? `<span class="diff ${diffCls}">${fmtDiff(diff)}</span>` : '';

      const chips = [];
      if (t.spritze) {
        const bearbeitbar = istStrukturierteSpritze(t.spritze);
        const attr = bearbeitbar
          ? ` med-klick" data-med="${t.datum}" role="button" tabindex="0" title="Medikament bearbeiten`
          : '';
        chips.push(`<span class="chip med${attr}">${icon('pille')}${medText(t.spritze)}</span>`);
      }
      for (const ev of ereignisseAmTag(daten.ereignisse, t.datum)) {
        const label = KAT_LABEL[ev.kategorie] || 'Ereignis';
        chips.push(`<span class="chip ev" data-ev="${ev.id}" role="button" tabindex="0" title="Ereignis bearbeiten">${icon('kalender')}${label}</span>`);
      }
      const chipsHtml = chips.length ? `<div class="v-chips">${chips.join('')}</div>` : '';

      return `<div class="v-tag" data-datum="${t.datum}" role="button" tabindex="0">
          <div class="v-datum ${istHeute ? 'heute-ring' : ''}">
            <span class="v-wtag">${wochentag(t.datum)}</span>
            <span class="v-tagnr">${tagNr(t.datum)}</span>
          </div>
          <div class="v-mitte">
            <div class="v-gewicht-zeile">
              <span class="v-gewicht">${fmtKg(t.gewicht_kg)}<span class="v-einh">kg</span></span>
              ${diffHtml}
            </div>
            ${chipsHtml}
          </div>
          <div class="v-aktionen">
            <button type="button" class="v-akt edit" aria-label="Bearbeiten" title="Bearbeiten">${icon('stift')}</button>
            <button type="button" class="v-akt del" aria-label="Löschen" title="Löschen">${icon('x')}</button>
          </div>
        </div>`;
    }).join('');

    return `<div class="v-monat"><span>${MONATE[g.monat - 1]} ${g.jahr}</span><span class="v-zusatz">${zusatz}</span></div>
      <section class="karte v-karte">${zeilen}</section>`;
  }).join('') || `<div class="verlauf-leer">Keine Einträge in diesem Jahr.</div>`;

  const MUELL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

  container.innerHTML = jahrLeisteHtml + html + `
    <div class="dialog-bg" id="v-dialog">
      <div class="dialog">
        <div class="d-titel">Eintrag löschen?</div>
        <div class="d-text" id="v-d-text"></div>
        <div class="d-btns">
          <button type="button" id="v-d-abbr">Abbrechen</button>
          <button type="button" class="gefahr" id="v-d-ok">Löschen</button>
        </div>
      </div>
    </div>

    <div class="dialog-bg" id="v-ev-dialog">
      <div class="dialog ev-edit">
        <div class="d-titel">Ereignis bearbeiten</div>
        <div class="feld"><label>Kategorie</label><div id="v-ev-kat"></div></div>
        <div class="zeitraum">
          <div class="feld"><label>Von</label><span id="v-ev-von"></span></div>
          <div class="feld"><label>Bis</label><span id="v-ev-bis"></span></div>
        </div>
        <div class="feld"><label>Notiz</label><input class="notiz" id="v-ev-notiz" type="text" placeholder="optional"></div>
        <div class="d-btns">
          <button type="button" id="v-ev-abbr">Abbrechen</button>
          <button type="button" class="primär" id="v-ev-ok">Speichern</button>
        </div>
        <div class="loeschen-zeile"><button type="button" id="v-ev-del">${MUELL_ICON}Ereignis löschen</button></div>
      </div>
    </div>

    <div class="dialog-bg" id="v-ev-del-dialog">
      <div class="dialog">
        <div class="d-titel">Ereignis löschen?</div>
        <div class="d-text" id="v-ev-del-text"></div>
        <div class="d-btns">
          <button type="button" id="v-ev-del-abbr">Abbrechen</button>
          <button type="button" class="gefahr" id="v-ev-del-ok">Löschen</button>
        </div>
      </div>
    </div>

    <div class="dialog-bg" id="v-med-dialog">
      <div class="dialog med-edit">
        <div class="d-titel">Medikament bearbeiten</div>
        <div class="feld"><label>Präparat</label><div id="v-med-praep"></div></div>
        <div class="zeile"><label>Dosis</label><div class="ctrl"><span class="num"><button type="button" id="v-med-dosis-minus">${icon('minus')}</button><input id="v-med-dosis" type="text" inputmode="decimal" readonly><button type="button" id="v-med-dosis-plus">${icon('plus')}</button></span><span style="font-size:14px;color:var(--fg-2)">mg</span></div></div>
        <div class="zeile"><label>Anwendung Nr.</label><div class="ctrl"><span class="num"><button type="button" id="v-med-pen-minus">${icon('minus')}</button><input id="v-med-pen" type="text" inputmode="numeric" readonly><button type="button" id="v-med-pen-plus">${icon('plus')}</button></span></div></div>
        <div class="d-btns">
          <button type="button" id="v-med-abbr">Abbrechen</button>
          <button type="button" class="primär" id="v-med-ok">Speichern</button>
        </div>
        <div class="loeschen-zeile"><button type="button" id="v-med-del">${MUELL_ICON}Medikament löschen</button></div>
      </div>
    </div>

    <div class="dialog-bg" id="v-med-del-dialog">
      <div class="dialog">
        <div class="d-titel">Medikament löschen?</div>
        <div class="d-text" id="v-med-del-text"></div>
        <div class="d-btns">
          <button type="button" id="v-med-del-abbr">Abbrechen</button>
          <button type="button" class="gefahr" id="v-med-del-ok">Löschen</button>
        </div>
      </div>
    </div>`;

  // ---- Edit-Sprung: Datum an den Eingabe-Screen übergeben ----
  function springeZuEingabe(datum) {
    location.hash = `#/eingabe?datum=${datum}`;
  }

  // ---- Lösch-Dialog ----
  const dialog = container.querySelector('#v-dialog');
  const dText = container.querySelector('#v-d-text');
  let zuLoeschen = null;

  function zeigeLoeschDialog(datum) {
    const eintrag = daten.tageseintraege[datum];
    const kg = eintrag ? fmtKg(eintrag.gewicht_kg) : '–';
    zuLoeschen = datum;
    dText.innerHTML = `Der Eintrag vom <b>${formatiereDatum(datum)}</b> (${kg} kg) wird dauerhaft entfernt.`;
    dialog.classList.add('auf');
  }
  container.querySelector('#v-d-abbr').addEventListener('click', () => {
    zuLoeschen = null;
    dialog.classList.remove('auf');
  });
  container.querySelector('#v-d-ok').addEventListener('click', () => {
    dialog.classList.remove('auf');
    if (!zuLoeschen) return;
    const datum = zuLoeschen;
    zuLoeschen = null;
    // undobar (Default true) → Undo-Button wird aktiv. Zugehörige Ereignisse bleiben.
    ctx.store.aktualisiere(d => entferneTageseintrag(d, datum));
  });

  // ---- Ereignis-Overlay (bearbeiten/löschen) ----
  const evDialog = container.querySelector('#v-ev-dialog');
  const evDelDialog = container.querySelector('#v-ev-del-dialog');
  const katHost = container.querySelector('#v-ev-kat');
  const notizFeld = container.querySelector('#v-ev-notiz');
  let aktEvId = null, katWahl = 'urlaub';

  const katSeg = document.createElement('div');
  katSeg.className = 'seg';
  katSeg.style.justifyContent = 'flex-start';
  katSeg.style.flexWrap = 'wrap';
  for (const v of EINGABE_KATEGORIEN) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = KAT_LABEL[v]; b.dataset.v = v;
    b.addEventListener('click', () => { katWahl = v; markiereKat(); });
    katSeg.appendChild(b);
  }
  katHost.appendChild(katSeg);
  function markiereKat() {
    for (const b of katSeg.children) b.classList.toggle('aktiv', b.dataset.v === katWahl);
  }

  const heuteIso = heuteLokal();
  const evVon = datumsPicker(container.querySelector('#v-ev-von'), heuteIso, () => {}, formatiereDatumKurz);
  const evBis = datumsPicker(container.querySelector('#v-ev-bis'), heuteIso, () => {}, formatiereDatumKurz);

  function oeffneEvDialog(id) {
    const ev = ctx.store.get().ereignisse.find(e => e.id === id);
    if (!ev) return;
    aktEvId = id;
    katWahl = istEingabeKategorie(ev.kategorie) ? ev.kategorie : null;
    markiereKat();
    evVon.setWert(ev.von);
    evBis.setWert(ev.bis);
    notizFeld.value = ev.freitext || '';
    evDialog.classList.add('auf');
  }

  container.querySelector('#v-ev-abbr').addEventListener('click', () => {
    aktEvId = null; evDialog.classList.remove('auf');
  });

  container.querySelector('#v-ev-ok').addEventListener('click', () => {
    if (!aktEvId) return;
    if (!katWahl) { markiereKat(); return; }
    const id = aktEvId;
    const von = evVon.getWert(), bis = evBis.getWert();
    const freitext = notizFeld.value || null;
    evDialog.classList.remove('auf');
    aktEvId = null;
    ctx.store.aktualisiere(d => ({ ...d, ereignisse: aktualisiereEreignis(d.ereignisse, id, { kategorie: katWahl, von, bis, freitext }) }));
  });

  container.querySelector('#v-ev-del').addEventListener('click', () => {
    const ev = ctx.store.get().ereignisse.find(e => e.id === aktEvId);
    if (!ev) return;
    const label = KAT_LABEL[ev.kategorie] || 'Ereignis';
    const spanne = ev.von === ev.bis ? formatiereDatum(ev.von) : `${formatiereDatum(ev.von)} – ${formatiereDatum(ev.bis)}`;
    container.querySelector('#v-ev-del-text').innerHTML = `<b>${label}</b> (${spanne}) wird dauerhaft entfernt.`;
    evDialog.classList.remove('auf');
    evDelDialog.classList.add('auf');
  });

  container.querySelector('#v-ev-del-abbr').addEventListener('click', () => {
    aktEvId = null;
    evDelDialog.classList.remove('auf');
  });

  container.querySelector('#v-ev-del-ok').addEventListener('click', () => {
    const id = aktEvId;
    aktEvId = null;
    evDelDialog.classList.remove('auf');
    if (!id) return;
    ctx.store.aktualisiere(d => ({ ...d, ereignisse: entferneEreignis(d.ereignisse, id) }));
  });

  // ---- Medikament-Overlay (bearbeiten/löschen) ----
  const medDialog = container.querySelector('#v-med-dialog');
  const medDelDialog = container.querySelector('#v-med-del-dialog');
  const medPraepHost = container.querySelector('#v-med-praep');
  const medDosisFeld = container.querySelector('#v-med-dosis');
  const medPenFeld = container.querySelector('#v-med-pen');
  let aktMedDatum = null, praepWahl = 'MJ', dosisIdx = 0;

  // Präparat-Segment aufbauen
  const medPraepSeg = document.createElement('div');
  medPraepSeg.className = 'seg';
  medPraepSeg.style.justifyContent = 'flex-start';
  for (const p of PRAEPARATE) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = p; b.dataset.v = p;
    b.addEventListener('click', () => {
      praepWahl = p;
      dosisIdx = Math.min(dosisIdx, DOSIS_LISTE[praepWahl].length - 1);
      markiereMedPraep();
      zeichneMedDosis();
    });
    medPraepSeg.appendChild(b);
  }
  medPraepHost.appendChild(medPraepSeg);

  function markiereMedPraep() {
    for (const b of medPraepSeg.children) b.classList.toggle('aktiv', b.dataset.v === praepWahl);
  }
  function zeichneMedDosis() {
    medDosisFeld.value = fmtKg(DOSIS_LISTE[praepWahl][dosisIdx]).replace('.', ',');
  }

  function oeffneMedDialog(datum) {
    const sp = ctx.store.get().tageseintraege[datum]?.spritze;
    if (!istStrukturierteSpritze(sp)) return;
    aktMedDatum = datum;
    praepWahl = PRAEPARATE.includes(sp.praeparat) ? sp.praeparat : 'MJ';
    dosisIdx = dosisIndex(DOSIS_LISTE[praepWahl], sp.dosis_mg);
    medPenFeld.value = String(sp.pen_anwendung || 1);
    markiereMedPraep();
    zeichneMedDosis();
    medDialog.classList.add('auf');
  }

  container.querySelector('#v-med-abbr').addEventListener('click', () => {
    aktMedDatum = null;
    medDialog.classList.remove('auf');
  });

  container.querySelector('#v-med-ok').addEventListener('click', () => {
    if (!aktMedDatum) return;
    const neu = {
      praeparat: praepWahl,
      dosis_mg: DOSIS_LISTE[praepWahl][dosisIdx],
      pen_anwendung: parseInt(medPenFeld.value, 10) || null,
      historie_rohtext: null,
    };
    const datum = aktMedDatum;
    medDialog.classList.remove('auf');
    aktMedDatum = null;
    ctx.store.aktualisiere(d => ({ ...d, tageseintraege: setzeSpritze(d.tageseintraege, datum, neu) }));
  });

  container.querySelector('#v-med-dosis-minus').addEventListener('click', () => {
    dosisIdx = Math.max(0, dosisIdx - 1);
    zeichneMedDosis();
  });
  container.querySelector('#v-med-dosis-plus').addEventListener('click', () => {
    dosisIdx = Math.min(DOSIS_LISTE[praepWahl].length - 1, dosisIdx + 1);
    zeichneMedDosis();
  });
  container.querySelector('#v-med-pen-minus').addEventListener('click', () => {
    medPenFeld.value = String(Math.max(1, (parseInt(medPenFeld.value, 10) || 1) - 1));
  });
  container.querySelector('#v-med-pen-plus').addEventListener('click', () => {
    medPenFeld.value = String((parseInt(medPenFeld.value, 10) || 0) + 1);
  });

  container.querySelector('#v-med-del').addEventListener('click', () => {
    if (!aktMedDatum) return;
    container.querySelector('#v-med-del-text').innerHTML =
      `<b>${praepWahl} ${fmtKg(DOSIS_LISTE[praepWahl][dosisIdx]).replace('.', ',')} mg</b> (${formatiereDatum(aktMedDatum)}) wird vom Tag entfernt. Das Gewicht bleibt erhalten.`;
    medDialog.classList.remove('auf');
    medDelDialog.classList.add('auf');
  });

  container.querySelector('#v-med-del-abbr').addEventListener('click', () => {
    aktMedDatum = null;
    medDelDialog.classList.remove('auf');
  });

  container.querySelector('#v-med-del-ok').addEventListener('click', () => {
    const datum = aktMedDatum;
    medDialog.classList.remove('auf');
    medDelDialog.classList.remove('auf');
    aktMedDatum = null;
    if (!datum) return;
    ctx.store.aktualisiere(d => ({ ...d, tageseintraege: entferneSpritze(d.tageseintraege, datum) }));
  });

  // ---- Zeilen-Interaktion ----
  for (const zeile of container.querySelectorAll('.v-tag')) {
    const datum = zeile.dataset.datum;
    zeile.querySelector('.v-akt.del').addEventListener('click', (e) => {
      e.stopPropagation();
      zeigeLoeschDialog(datum);
    });
    zeile.querySelector('.v-akt.edit').addEventListener('click', (e) => {
      e.stopPropagation();
      springeZuEingabe(datum);
    });
    // Klick/Enter auf die Zeile selbst = ebenfalls bearbeiten.
    zeile.addEventListener('click', () => springeZuEingabe(datum));
    zeile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); springeZuEingabe(datum); }
    });
    for (const chip of zeile.querySelectorAll('.chip.ev')) {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        oeffneEvDialog(chip.dataset.ev);
      });
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); oeffneEvDialog(chip.dataset.ev); }
      });
    }
    for (const chip of zeile.querySelectorAll('.chip.med-klick')) {
      chip.addEventListener('click', (e) => { e.stopPropagation(); oeffneMedDialog(chip.dataset.med); });
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); oeffneMedDialog(chip.dataset.med); }
      });
    }
  }

  // ---- Jahr-Filter: Klick setzt den Zustand und baut neu auf ----
  for (const b of container.querySelectorAll('.jahr-leiste button')) {
    b.addEventListener('click', () => {
      const j = b.dataset.jahr;
      jahrFilter = j === 'alle' ? 'alle' : +j;
      baue();
    });
  }
  }

  baue();
}
