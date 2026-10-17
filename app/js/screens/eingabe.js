import { PRAEPARATE, EINGABE_KATEGORIEN, istEingabeKategorie, istGueltigesDatum } from '../schema.js';
import { neuesEreignis, ereignislageAmTag, setzeTagesereignis } from '../ereignisse.js';
import { datumsPicker, formatiereDatum } from '../felder.js';
import { letzterGewichtVor, letztesMedikament, dosisIndex } from '../db.js';
import { datumAusHash } from '../router.js';
import { icon } from '../icons.js';

function heuteIso() { return new Date().toISOString().slice(0, 10); }

// Verschiebt ein ISO-Datum um `delta` Tage (UTC-basiert, zeitzonensicher).
function datumPlusTage(iso, delta) {
  const [j, m, t] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(j, m - 1, t + delta));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// Zahl-Helfer: Komma als Dezimaltrenner (DE), eine Nachkommastelle.
const parseKomma = (s) => parseFloat(String(s).replace(',', '.'));
const fmtKomma = (n) => n.toFixed(1).replace('.', ',');
// Kurzdatum "14.10." für die Vorschlags-Pille.
function kurzDatum(iso) {
  const [, m, t] = iso.split('-');
  return `${t}.${m}.`;
}

const KAT_LABEL = { urlaub: 'Urlaub', feiertag_fest: 'Fest', krankheit: 'Krankheit', wiesn: 'Wiesn', sonstiges: 'Sonst' };
const DOSIS_LISTE = { MJ: [2.5, 5, 7.5, 10, 12.5, 15], OZ: [0.25, 0.5, 1, 2], WG: [0.25, 0.5, 1, 1.7, 2.4] };

// Modulweites Flag für die Erfolgs-Pille, damit sie den globalen Re-Render überlebt.
// main.js ruft bei jedem store.aktualisiere() render() auf → #screen wird komplett neu
// gebaut und lokaler DOM-State verworfen (bekannter Bug). Lösung ohne main.js-Umbau:
// Vor dem aktualisiere() setzen wir ein Flag mit Text + Ablaufzeit; renderEingabe prüft
// das Flag beim (durch render ausgelösten) Neuaufbau und zeigt die Pille für den Rest
// ihrer Lebensdauer, inkl. setTimeout zum sauberen Ausblenden.
let zuletztGespeichert = null; // { text, bis } | null

const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
const WARN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

export function renderEingabe(container, ctx) {
  const heute = heuteIso();
  // Start-Datum: aus dem Hash-Query (#/eingabe?datum=…) übernehmen, falls gültig
  // (Edit-Sprung aus dem Verlauf). Einmalig beim Render ausgelesen, danach steuert der
  // Datums-Picker das `datum`. Fällt auf heute zurück.
  const vomSprung = datumAusHash(location.hash);
  let datum = (vomSprung && istGueltigesDatum(vomSprung)) ? vomSprung : heute;

  container.innerHTML = `
    <section class="karte">
      <div class="zeile zeile-datum">
        <label>Datum <span class="heute-tag" id="ein-heute">Heute</span></label>
        <div class="datum-nav">
          <button type="button" class="tag-pfeil" id="ein-tag-zurueck" aria-label="Ein Tag zurück"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
          <span id="ein-datum"></span>
          <button type="button" class="tag-pfeil" id="ein-tag-vor" aria-label="Ein Tag vor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
        </div>
      </div>
    </section>

    <section class="hero-ein" id="ein-hero">
      <div class="label">Gewicht</div>
      <div class="hero-wert-zeile">
        <div class="stepper-v"><button type="button" id="ein-plus" aria-label="0,1 kg mehr"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button><button type="button" id="ein-minus" aria-label="0,1 kg weniger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button></div>
        <span class="gewicht-feld"><input id="ein-gewicht" type="text" inputmode="decimal" autocomplete="off"><span class="einheit">kg</span></span>
      </div>
      <div class="hero-hint" id="ein-hero-hint"></div>
    </section>

    <button type="button" class="speichern" id="ein-speichern">Speichern</button>
    <div class="ok-pill" id="ein-ok"><span>${CHECK_ICON}</span><span id="ein-ok-text">gespeichert</span></div>

    <section class="karte">
      <div class="add-zeile" id="ein-ev-trigger">
        <span class="links">${CHEV} <span id="ein-ev-links">Ereignis</span></span>
        <span class="rechts" id="ein-ev-rechts">Urlaub · Fest · Krankheit · Wiesn · Sonst</span>
      </div>
      <div class="collapse" id="ein-ev">
        <div class="zeile zeile-datum"><label>Von</label><div class="ctrl"><span id="ein-ev-von"></span></div></div>
        <div class="zeile zeile-datum"><label>Bis</label><div class="ctrl"><span id="ein-ev-bis"></span></div></div>
        <div class="zeile" style="flex-wrap:wrap;justify-content:flex-start"><label style="width:100%;margin-bottom:4px">Kategorie</label><div id="ein-ev-kat"></div></div>
        <div class="zeile"><label>Notiz</label><div class="ctrl"><input class="text" id="ein-ev-text" type="text" placeholder="optional"></div></div>
      </div>
    </section>

    <section class="karte">
      <div class="add-zeile" id="ein-med-trigger">
        <span class="links">${CHEV} <span id="ein-med-links">Medikament</span></span>
        <span class="rechts" id="ein-med-zuletzt"></span>
      </div>
      <div class="collapse" id="ein-med">
        <div class="zeile" style="flex-wrap:wrap;justify-content:flex-start"><label style="width:100%;margin-bottom:4px">Präparat</label><div id="ein-med-praep"></div></div>
        <div class="zeile"><label>Dosis</label><div class="ctrl"><span class="num"><button type="button" id="ein-dosis-minus">${icon('minus')}</button><input id="ein-dosis" type="text" inputmode="decimal" readonly><button type="button" id="ein-dosis-plus">${icon('plus')}</button></span><span style="font-size:14px;color:var(--fg-2)">mg</span></div></div>
        <div class="zeile"><label>Anwendung Nr.</label><div class="ctrl"><span class="num"><button type="button" id="ein-pen-minus">${icon('minus')}</button><input id="ein-pen" type="text" inputmode="numeric" readonly><button type="button" id="ein-pen-plus">${icon('plus')}</button></span></div></div>
      </div>
    </section>

    <div class="dialog-bg" id="ein-dialog">
      <div class="dialog">
        <div class="d-titel">Tag überschreiben?</div>
        <div class="d-text" id="ein-d-text"></div>
        <div class="d-btns"><button type="button" id="ein-d-abbr">Abbrechen</button><button type="button" class="primär" id="ein-d-ok">Überschreiben</button></div>
      </div>
    </div>`;


  const hero = container.querySelector('#ein-hero');
  const gewFeld = container.querySelector('#ein-gewicht');
  const heroHint = container.querySelector('#ein-hero-hint');
  const heuteTag = container.querySelector('#ein-heute');
  let istVorschlag = false; // Feld zeigt gerade einen (grauen) Vorschlag, keinen echten Wert

  // ---- Datum ----
  const datumPicker = datumsPicker(container.querySelector('#ein-datum'), datum, (iso) => {
    datum = iso;
    aktualisiereDatumAbhaengiges();
  });

  // ---- Tag-vor/zurück-Pfeile ----
  const btnTagZurueck = container.querySelector('#ein-tag-zurueck');
  const btnTagVor = container.querySelector('#ein-tag-vor');
  function geheTag(delta) {
    const neu = datumPlusTage(datum, delta);
    // Nicht über heute hinaus in die Zukunft.
    if (neu > heute) return;
    datum = neu;
    datumPicker.setWert(datum);          // Picker-Anzeige mitziehen (löst kein onChange)
    aktualisiereDatumAbhaengiges();      // alle datumsabhängigen Teile + Pfeil-Zustand neu
  }
  btnTagZurueck.addEventListener('click', () => geheTag(-1));
  btnTagVor.addEventListener('click', () => geheTag(1));

  // ---- Gewicht-Hero ----
  function entschaerfeVorschlag() {
    if (!istVorschlag) return;
    istVorschlag = false;
    hero.classList.remove('vorschlag');
    heroHint.innerHTML = '';
  }

  function step(delta) {
    const n = Math.max(30, Math.min(400, Math.round(((parseKomma(gewFeld.value) || 0) + delta) * 10) / 10));
    gewFeld.value = fmtKomma(n);
    entschaerfeVorschlag();
  }
  container.querySelector('#ein-plus').addEventListener('click', () => step(0.1));
  container.querySelector('#ein-minus').addEventListener('click', () => step(-0.1));
  gewFeld.addEventListener('input', entschaerfeVorschlag);
  gewFeld.addEventListener('focus', entschaerfeVorschlag);
  heroHint.addEventListener('click', (e) => { if (e.target.closest('.pill-hint.vorschlag')) entschaerfeVorschlag(); });

  // Bestimmt Feldwert + Hinweis-Pille je nach gewähltem Datum. Wird bei jedem
  // Datumswechsel neu ausgeführt (onChange des datumsPickers).
  function aktualisiereDatumAbhaengiges() {
    // Vorwärts-Pfeil sperren, sobald heute erreicht ist (keine Zukunft).
    if (btnTagVor) btnTagVor.disabled = (datum >= heute);
    const daten = ctx.store.get();
    heuteTag.style.display = (datum === heute) ? '' : 'none';
    const bestehend = daten.tageseintraege[datum];
    if (bestehend) {
      // Tag existiert schon → gespeicherten Wert zeigen (normal), gelbe Warn-Pille.
      istVorschlag = false;
      hero.classList.remove('vorschlag');
      gewFeld.value = fmtKomma(bestehend.gewicht_kg);
      heroHint.innerHTML = `<span class="pill-hint warn">${WARN_ICON}Dieser Tag ist schon erfasst – wird überschrieben</span>`;
    } else {
      const letzter = letzterGewichtVor(daten, datum);
      if (letzter != null) {
        // Neuer Tag mit Vorschlag (grau).
        istVorschlag = true;
        hero.classList.add('vorschlag');
        gewFeld.value = fmtKomma(letzter);
        // Datum des letzten Eintrags für die Pille suchen (jüngster < datum).
        const vorDatum = Object.keys(daten.tageseintraege).filter(k => k < datum).sort().pop();
        heroHint.innerHTML = `<span class="pill-hint vorschlag">zuletzt ${fmtKomma(letzter)} kg (${kurzDatum(vorDatum)}) · tippen zum Übernehmen</span>`;
      } else {
        // Neuer Tag ohne Historie → leer.
        istVorschlag = false;
        hero.classList.remove('vorschlag');
        gewFeld.value = '';
        heroHint.innerHTML = '';
      }
    }
    // Ereignis-/Medikament-Panel aus dem jetzt gewählten Tag neu vorbelegen
    // (Edit-Dialog-Verhalten; verhindert Hängenbleiben von Werten des Vortages).
    syncEvPanel();
    syncMedPanel();
    // Status-Zeilen fürs (ggf. gewechselte) Datum neu aufbauen.
    aktualisiereEvStatus();
    aktualisiereMedStatus();
  }

  // ---- Collapse-Trigger ----
  function toggle(trigger, panel, onToggle) {
    trigger.addEventListener('click', () => {
      const auf = panel.classList.toggle('auf');
      trigger.classList.toggle('offen', auf);
      onToggle?.(auf);
    });
  }
  const evTrigger = container.querySelector('#ein-ev-trigger');
  const evPanel = container.querySelector('#ein-ev');
  const medTrigger = container.querySelector('#ein-med-trigger');
  const medPanel = container.querySelector('#ein-med');
  toggle(evTrigger, evPanel, () => aktualisiereEvStatus());
  toggle(medTrigger, medPanel, () => aktualisiereMedStatus());

  // ---- Ereignis-Felder ----
  const evVon = datumsPicker(container.querySelector('#ein-ev-von'), datum, () => aktualisiereEvStatus());
  const evBis = datumsPicker(container.querySelector('#ein-ev-bis'), datum, () => aktualisiereEvStatus());
  const notizFeld = container.querySelector('#ein-ev-text');
  const katHost = container.querySelector('#ein-ev-kat');
  const katSeg = document.createElement('div'); katSeg.className = 'seg'; katSeg.style.justifyContent = 'flex-start';
  // Fix 5: Keine Kategorie ist beim Aufklappen aktiv, SOLANGE kein Ereignis am Tag
  // gespeichert ist. Erst ein bewusster Klick (oder Vorbelegung eines gespeicherten
  // Ereignisses, siehe syncEvPanel) setzt evAusgewaehlt und markiert ein Segment blau.
  let katWahl = 'urlaub';
  let evAusgewaehlt = false;
  for (const v of EINGABE_KATEGORIEN) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = KAT_LABEL[v]; b.dataset.v = v;
    b.addEventListener('click', () => {
      katWahl = v;
      evAusgewaehlt = true;
      for (const k of katSeg.children) k.classList.toggle('aktiv', k.dataset.v === v);
      aktualisiereEvStatus();
    });
    katSeg.appendChild(b);
  }
  katHost.appendChild(katSeg);

  // Markiert das Kategorie-Segment (oder keins, wenn kat null/nicht im UI-Set).
  function markiereKatSeg(kat) {
    for (const k of katSeg.children) k.classList.toggle('aktiv', k.dataset.v === kat);
  }

  // Lädt das Ereignis-Panel aus dem gespeicherten Tagesereignis (von === datum) bzw.
  // setzt es auf Default zurück. Läuft beim ersten Render UND bei jedem Datumswechsel,
  // damit keine Werte vom vorigen Tag hängen bleiben (Edit-Dialog-Verhalten).
  function syncEvPanel() {
    const evAmTag = ctx.store.get().ereignisse.find(e => e.von === datum) || null;
    if (evAmTag) {
      evVon.setWert(evAmTag.von);
      evBis.setWert(evAmTag.bis);
      notizFeld.value = evAmTag.freitext || '';
      if (istEingabeKategorie(evAmTag.kategorie)) {
        // Gespeicherte Kategorie ist im UI wählbar → vorbelegen + als bewusst gewählt werten.
        katWahl = evAmTag.kategorie;
        evAusgewaehlt = true;
        markiereKatSeg(evAmTag.kategorie);
      } else {
        // Alt-Kategorie (z.B. 'sport') nicht mehr im Segment: Von/Bis/Notiz trotzdem
        // vorbefüllen, aber KEIN Segment aktiv → Nutzer muss bewusst neu wählen.
        katWahl = 'urlaub';
        evAusgewaehlt = false;
        markiereKatSeg(null);
      }
    } else {
      // Kein Tagesereignis → Default (nichts aktiv, Von/Bis = gewähltes Datum, Notiz leer).
      evVon.setWert(datum);
      evBis.setWert(datum);
      notizFeld.value = '';
      katWahl = 'urlaub';
      evAusgewaehlt = false;
      markiereKatSeg(null);
    }
  }

  // ---- Medikament-Felder ----
  // Dezenter Default-Hinweis für die zugeklappte Zeile (wenn nichts eingestellt/erfasst).
  // Als Funktion, damit er beim Datumswechsel das jetzt gültige letzte Medikament zeigt.
  function medDefaultHintText() {
    const letztes = letztesMedikament(ctx.store.get(), datum);
    return letztes
      ? `zuletzt: ${letztes.praeparat} ${fmtKomma(letztes.dosis_mg)} mg`
      : 'noch keins erfasst';
  }

  const dosisFeld = container.querySelector('#ein-dosis');
  const penFeld = container.querySelector('#ein-pen');
  let praepWahl = 'MJ';
  let dosisIdx = 0;

  function zeichneDosis() { dosisFeld.value = fmtKomma(DOSIS_LISTE[praepWahl][dosisIdx]); }

  const praepHost = container.querySelector('#ein-med-praep');
  const praepSeg = document.createElement('div'); praepSeg.className = 'seg'; praepSeg.style.justifyContent = 'flex-start';
  for (const p of PRAEPARATE) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = p; b.dataset.v = p;
    b.addEventListener('click', () => {
      praepWahl = p;
      for (const k of praepSeg.children) k.classList.toggle('aktiv', k.dataset.v === p);
      // Dosis-Liste wechselt: nächsten gültigen Wert wählen (Index klemmen).
      dosisIdx = Math.min(dosisIdx, DOSIS_LISTE[praepWahl].length - 1);
      zeichneDosis();
      aktualisiereMedStatus();
    });
    praepSeg.appendChild(b);
  }
  praepHost.appendChild(praepSeg);

  function markierePraepSeg(p) {
    for (const k of praepSeg.children) k.classList.toggle('aktiv', k.dataset.v === p);
  }

  // Lädt das Medikament-Panel aus der am Tag gespeicherten Spritze bzw. aus der letzten
  // Eingabe (+1 bei der Nummer). Läuft beim ersten Render UND bei jedem Datumswechsel.
  function syncMedPanel() {
    const spritzeAmTag = ctx.store.get().tageseintraege[datum]?.spritze || null;
    if (spritzeAmTag) {
      // Editieren eines bestehenden Tages: gespeicherte Werte zeigen (Nr. OHNE +1).
      praepWahl = PRAEPARATE.includes(spritzeAmTag.praeparat) ? spritzeAmTag.praeparat : 'MJ';
      dosisIdx = dosisIndex(DOSIS_LISTE[praepWahl], spritzeAmTag.dosis_mg);
      penFeld.value = String(spritzeAmTag.pen_anwendung || 1);
    } else {
      // Neuer Tag: an letztem Medikament orientieren (+1 bei der Nummer).
      const letztes = letztesMedikament(ctx.store.get(), datum);
      praepWahl = letztes?.praeparat && PRAEPARATE.includes(letztes.praeparat) ? letztes.praeparat : 'MJ';
      dosisIdx = letztes ? dosisIndex(DOSIS_LISTE[praepWahl], letztes.dosis_mg) : 0;
      penFeld.value = String(letztes ? (letztes.pen_anwendung || 0) + 1 : 1);
    }
    markierePraepSeg(praepWahl);
    zeichneDosis();
  }

  container.querySelector('#ein-dosis-minus').addEventListener('click', () => {
    dosisIdx = Math.max(0, dosisIdx - 1); zeichneDosis(); aktualisiereMedStatus();
  });
  container.querySelector('#ein-dosis-plus').addEventListener('click', () => {
    dosisIdx = Math.min(DOSIS_LISTE[praepWahl].length - 1, dosisIdx + 1); zeichneDosis(); aktualisiereMedStatus();
  });
  container.querySelector('#ein-pen-minus').addEventListener('click', () => {
    penFeld.value = String(Math.max(1, (parseInt(penFeld.value, 10) || 1) - 1));
    aktualisiereMedStatus();
  });
  container.querySelector('#ein-pen-plus').addEventListener('click', () => {
    penFeld.value = String((parseInt(penFeld.value, 10) || 0) + 1);
    aktualisiereMedStatus();
  });

  // ---- Dynamische Status-Zeilen (Fix 6) ----
  const evRechts = container.querySelector('#ein-ev-rechts');
  const evLinks = container.querySelector('#ein-ev-links');
  const medRechts = container.querySelector('#ein-med-zuletzt');
  const medLinks = container.querySelector('#ein-med-links');
  const EV_DEFAULT_HINT = 'Urlaub · Fest · Krankheit · Wiesn · Sonst';
  const gruenerHaken = `<span class="status-haken">${CHECK_ICON}</span>`;

  // Zusammenfassungstext für ein Ereignis: "<Kat> · <Von>" bzw. "<Kat> · Von–Bis".
  function evZusammenfassung(kat, vonIso, bisIso) {
    const label = KAT_LABEL[kat] || 'Ereignis'; // Fallback für Alt-Kategorien (z.B. 'sport')
    const spanne = (vonIso === bisIso) ? kurzDatum(vonIso) : `${kurzDatum(vonIso)}–${kurzDatum(bisIso)}`;
    return `${label} · ${spanne}`;
  }
  // Zusammenfassungstext für ein Medikament: "<Präparat> <Dosis> mg · Nr. <n>".
  function medZusammenfassung(praep, dosis, nr) {
    return `${praep} ${fmtKomma(dosis)} mg · Nr. ${nr}`;
  }

  // Baut die Ereignis-Trigger-Zeile neu auf. Drei Zustände je nach Datenlage:
  //   'start'  → grüner „erfasst"-Haken + Zusammenfassung (editierbar).
  //   'laeuft' → gedämpfter Info-Zustand „läuft" (rein informativ, nicht editierbar),
  //              SOFERN der Nutzer nicht bewusst eine neue Kategorie gewählt hat.
  //   'keins'  → bewusst eingestellt (noch nicht gespeichert) ODER Default-Hinweis.
  function aktualisiereEvStatus() {
    const lage = ereignislageAmTag(ctx.store.get().ereignisse, datum);
    evRechts.classList.remove('laeuft'); // etwaige frühere Dämpfung zurücksetzen
    if (lage.art === 'start') {
      // Ereignis startet an diesem Tag → bereits erfasst, grüner Haken.
      evLinks.textContent = 'Ereignis erfasst';
      evRechts.innerHTML = gruenerHaken + evZusammenfassung(lage.ereignis.kategorie, lage.ereignis.von, lage.ereignis.bis);
      return;
    }
    if (evPanel.classList.contains('auf') && evAusgewaehlt) {
      // Bewusste (Neu-)Auswahl – auch an einem Überlappungstag möglich → wird gespeichert.
      evLinks.textContent = 'Ereignis';
      evRechts.textContent = evZusammenfassung(katWahl, evVon.getWert(), evBis.getWert());
      return;
    }
    if (lage.art === 'laeuft') {
      // Mehrtägiges Ereignis überlappt den Tag nur → gedämpfter „läuft"-Hinweis, kein Haken.
      evLinks.textContent = 'Ereignis läuft';
      const e = lage.ereignis;
      const spanne = (e.von === e.bis) ? kurzDatum(e.von) : `${kurzDatum(e.von)}–${kurzDatum(e.bis)}`;
      evRechts.classList.add('laeuft');
      evRechts.textContent = `${KAT_LABEL[e.kategorie] || 'Ereignis'} · läuft (${spanne})`;
      return;
    }
    // Kein Ereignis am Tag, nichts bewusst gewählt → dezenter Default-Hinweis.
    evLinks.textContent = 'Ereignis';
    evRechts.textContent = EV_DEFAULT_HINT;
  }

  // Baut die Medikament-Trigger-Zeile neu auf.
  function aktualisiereMedStatus() {
    const spritzeGespeichert = ctx.store.get().tageseintraege[datum]?.spritze || null;
    if (spritzeGespeichert) {
      medLinks.textContent = 'Medikament erfasst';
      medRechts.innerHTML = gruenerHaken + medZusammenfassung(
        spritzeGespeichert.praeparat, spritzeGespeichert.dosis_mg, spritzeGespeichert.pen_anwendung);
      return;
    }
    if (medPanel.classList.contains('auf')) {
      // Aufgeklappt → Präparat/Dosis/Nr. haben gültige Defaults, gilt als eingestellt.
      medLinks.textContent = 'Medikament';
      medRechts.textContent = medZusammenfassung(
        praepWahl, DOSIS_LISTE[praepWahl][dosisIdx], parseInt(penFeld.value, 10) || 1);
      return;
    }
    medLinks.textContent = 'Medikament';
    medRechts.textContent = medDefaultHintText();
  }

  // ---- Dialog ----
  const dialog = container.querySelector('#ein-dialog');
  const dText = container.querySelector('#ein-d-text');
  container.querySelector('#ein-d-abbr').addEventListener('click', () => dialog.classList.remove('auf'));

  // ---- Speichern ----
  function baueSpritze() {
    if (!medPanel.classList.contains('auf')) return null;
    return {
      praeparat: praepWahl,
      dosis_mg: DOSIS_LISTE[praepWahl][dosisIdx],
      pen_anwendung: parseInt(penFeld.value, 10) || null,
      historie_rohtext: null,
    };
  }

  async function speichereNun(gewicht) {
    const spritze = baueSpritze();
    // Fix 5: Ereignis nur, wenn Panel offen UND bewusst eine Kategorie angetippt wurde.
    const evAktiv = evPanel.classList.contains('auf') && evAusgewaehlt;
    const evVonW = evVon.getWert();
    const evBisW = evBis.getWert();
    const evKat = katWahl;
    const evText = container.querySelector('#ein-ev-text').value || null;
    const datumFest = datum;

    // Flag VOR aktualisiere() setzen, damit der durch den Store ausgelöste globale
    // Re-Render (der diesen Screen neu baut) die Erfolgs-Pille wieder herstellt.
    zuletztGespeichert = { text: `${fmtKomma(gewicht)} kg · ${formatiereDatum(datumFest)} gespeichert`, bis: Date.now() + 2600 };

    await ctx.store.aktualisiere((d) => {
      const next = { ...d, tageseintraege: { ...d.tageseintraege, [datumFest]: { gewicht_kg: gewicht, spritze } } };
      if (evAktiv) {
        // Bestehendes, an DIESEM Tag startendes Ereignis ersetzen (keine Dublette);
        // überlappende Ereignisse von anderen Tagen bleiben erhalten.
        const ev = neuesEreignis(evVonW || datumFest, evBisW || datumFest, evKat, evText);
        next.ereignisse = setzeTagesereignis(d.ereignisse, datumFest, ev);
      }
      return next;
    });
    // Nach aktualisiere() wurde der Screen i.d.R. bereits neu gebaut (render); dieser
    // `container` ist dann veraltet. Die Pille zeigt der frische renderEingabe-Aufbau.
  }

  container.querySelector('#ein-speichern').addEventListener('click', () => {
    const gewicht = parseKomma(gewFeld.value);
    if (!(typeof gewicht === 'number') || Number.isNaN(gewicht) || gewicht < 30 || gewicht > 400) {
      heroHint.innerHTML = `<span class="pill-hint warn">${WARN_ICON}Bitte ein gültiges Gewicht (30–400 kg) eingeben</span>`;
      return;
    }
    const gerundet = Math.round(gewicht * 10) / 10;
    const bestehend = ctx.store.get().tageseintraege[datum];
    if (bestehend) {
      dText.innerHTML = `Für den <b>${formatiereDatum(datum)}</b> sind bereits <b>${fmtKomma(bestehend.gewicht_kg)} kg</b> erfasst. Mit <b>${fmtKomma(gerundet)} kg</b> überschreiben?`;
      dialog.classList.add('auf');
      container.querySelector('#ein-d-ok').onclick = () => { dialog.classList.remove('auf'); speichereNun(gerundet); };
    } else {
      speichereNun(gerundet);
    }
  });

  // ---- Erfolgs-Pille (überlebt Re-Render via Modul-Flag) ----
  function zeigeOkFallsNoetig() {
    if (!zuletztGespeichert) return;
    const rest = zuletztGespeichert.bis - Date.now();
    if (rest <= 0) { zuletztGespeichert = null; return; }
    const okPill = container.querySelector('#ein-ok');
    const okText = container.querySelector('#ein-ok-text');
    const speichernBtn = container.querySelector('#ein-speichern');
    okText.textContent = zuletztGespeichert.text;
    okPill.classList.add('auf');
    speichernBtn.style.display = 'none';
    setTimeout(() => {
      zuletztGespeichert = null;
      okPill.classList.remove('auf');
      speichernBtn.style.display = '';
    }, rest);
  }

  // Initialzustand aufbauen und ggf. Erfolgs-Pille (nach Speichern) zeigen.
  aktualisiereDatumAbhaengiges();
  zeigeOkFallsNoetig();
}
