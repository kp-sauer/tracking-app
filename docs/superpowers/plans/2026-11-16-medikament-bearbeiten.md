# Medikament-Chips bearbeiten — Implementation Plan (schlank)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.
> Schlanker Ablauf (3 Tasks): Task 1 reine Logik (voller TDD + 2-stufiger Review),
> Task 2 DOM+CSS (ein kombinierter Review), Task 3 Browser-Verifikation durch den Controller.

**Goal:** Strukturierte Medikament-Chips im Verlauf per Klick bearbeiten & löschen (Overlay analog Ereignis-Chip).

**Architecture:** Neues Modul `app/js/spritze.js` (reine, immutable Funktionen, getestet). Dialog + Verdrahtung in `verlauf.js` nach Vorbild des Ereignis-Dialogs. `DOSIS_LISTE` nach `schema.js` zentralisiert (von eingabe.js + verlauf.js genutzt).

**Tech Stack:** Vanilla JS (ES-Module, kein Build), Tests via `node --test`.

**Spec:** `docs/specs/2026-11-16-medikament-bearbeiten-design.md`

**git:** Der Nutzer macht ALLE Commits + Push selbst. Subagenten fassen git NICHT an.

---

## Task 1: Modul `spritze.js` + `DOSIS_LISTE` zentralisieren (reine Logik, TDD)

**Files:**
- Create: `app/js/spritze.js`
- Test: `tests/spritze.test.js`
- Modify: `app/js/schema.js` (DOSIS_LISTE hinzufügen), `app/js/screens/eingabe.js` (DOSIS_LISTE importieren statt lokal)

- [ ] **Step 1: DOSIS_LISTE nach schema.js**

In `app/js/schema.js` nach `PRAEPARATE` (Zeile 14) einfügen:
```js
// Dosis-Stufen je Präparat (mg). Zentral, da Eingabe- UND Verlauf-Screen sie brauchen.
export const DOSIS_LISTE = Object.freeze({
  MJ: [2.5, 5, 7.5, 10, 12.5, 15], OZ: [0.25, 0.5, 1, 2], WG: [0.25, 0.5, 1, 1.7, 2.4]
});
```
In `app/js/screens/eingabe.js`: die lokale Zeile `const DOSIS_LISTE = { MJ: [...], OZ: [...], WG: [...] };` (um Zeile 29) ENTFERNEN und stattdessen `DOSIS_LISTE` aus dem bestehenden schema-Import ziehen. Prüfen, ob eingabe.js schon aus '../schema.js' importiert; falls ja, `DOSIS_LISTE` dort ergänzen, sonst einen Import hinzufügen.

- [ ] **Step 2: Failing test — `tests/spritze.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istStrukturierteSpritze, setzeSpritze, entferneSpritze } from '../app/js/spritze.js';

const strukturiert = { praeparat: 'MJ', dosis_mg: 12.5, pen_anwendung: 3, historie_rohtext: null };
const rohtext = { praeparat: 'OZ', dosis_mg: null, pen_anwendung: null, historie_rohtext: 'OZ 10/2' };

test('istStrukturierteSpritze: nur mit dosis_mg', () => {
  assert.equal(istStrukturierteSpritze(strukturiert), true);
  assert.equal(istStrukturierteSpritze(rohtext), false);
  assert.equal(istStrukturierteSpritze(null), false);
  assert.equal(istStrukturierteSpritze(undefined), false);
});

test('setzeSpritze ersetzt Spritze, lässt gewicht_kg unberührt', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: null }, '2026-07-02': { gewicht_kg: 90.1, spritze: null } };
  const neu = setzeSpritze(vorher, '2026-07-01', strukturiert);
  assert.deepEqual(neu['2026-07-01'], { gewicht_kg: 90.3, spritze: strukturiert });
  assert.equal(neu['2026-07-02'], vorher['2026-07-02']);          // andere Tage unverändert
  assert.equal(vorher['2026-07-01'].spritze, null);               // Immutabilität: altes Objekt unberührt
});

test('setzeSpritze: unbekannter Tag → unveränderte (neue) Map, kein neuer Tag', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: null } };
  const neu = setzeSpritze(vorher, '2026-07-09', strukturiert);
  assert.deepEqual(neu, vorher);
  assert.equal(neu['2026-07-09'], undefined);
  assert.notEqual(neu, vorher);                                   // neue Referenz
});

test('entferneSpritze setzt spritze=null, gewicht bleibt', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: strukturiert } };
  const neu = entferneSpritze(vorher, '2026-07-01');
  assert.deepEqual(neu['2026-07-01'], { gewicht_kg: 90.3, spritze: null });
  assert.equal(vorher['2026-07-01'].spritze, strukturiert);       // Immutabilität
});

test('entferneSpritze: unbekannter Tag → unveränderte (neue) Map', () => {
  const vorher = { '2026-07-01': { gewicht_kg: 90.3, spritze: strukturiert } };
  const neu = entferneSpritze(vorher, '2026-07-09');
  assert.deepEqual(neu, vorher);
  assert.notEqual(neu, vorher);
});
```

- [ ] **Step 3: `node --test tests/spritze.test.js`** → FAIL (Modul fehlt).

- [ ] **Step 4: `app/js/spritze.js`**

```js
// Spritzen-Logik (reine, immutable Funktionen). Die Spritze ist IM Tageseintrag
// eingebettet (tageseintraege[datum].spritze), nicht in einem eigenen Array wie
// Ereignisse — daher operieren diese Funktionen auf der tageseintraege-Map per Datums-Key.

// true, wenn die Spritze strukturiert (bearbeitbar) ist: vorhanden UND dosis_mg gesetzt.
// Rohtext-Altdaten (nur historie_rohtext, kein dosis_mg) → false, null/undefined → false.
export function istStrukturierteSpritze(spritze) {
  return !!spritze && spritze.dosis_mg != null;
}

// Ersetzt die Spritze des bestehenden Tageseintrags an `datum` (immutabel, neues Objekt).
// gewicht_kg und übrige Felder bleiben. Existiert der Tag NICHT → unveränderte (neue) Map
// (eine Spritze ohne Gewicht wäre ein ungültiger Tageseintrag — wir legen keinen an).
export function setzeSpritze(tageseintraege, datum, spritze) {
  const tag = tageseintraege[datum];
  if (!tag) return { ...tageseintraege };
  return { ...tageseintraege, [datum]: { ...tag, spritze } };
}

// Entfernt die Spritze des Tages (spritze: null), immutabel. Unbekannter Tag → neue, gleiche Map.
export function entferneSpritze(tageseintraege, datum) {
  const tag = tageseintraege[datum];
  if (!tag) return { ...tageseintraege };
  return { ...tageseintraege, [datum]: { ...tag, spritze: null } };
}
```

- [ ] **Step 5: `node --test tests/spritze.test.js`** → PASS (5 Tests). Außerdem Regression: `node --test tests/eingabe.test.js` (falls vorhanden) + `node -e "import('./app/js/schema.js').then(m=>console.log(!!m.DOSIS_LISTE))"` → `true`.

- [ ] **Step 6: Commit (NUR Nutzer)** — `app/js/spritze.js`, `tests/spritze.test.js`, `app/js/schema.js`, `app/js/screens/eingabe.js`.

---

## Task 2: Dialog + Verdrahtung in verlauf.js + CSS

**Files:**
- Modify: `app/js/screens/verlauf.js`, `app/css/app.css`
- Deploy: `app/js/version.js`, `app/sw.js` (v71 → v72, am Ende dieses Tasks)

> Kein Unit-Test (DOM). Verifikation in Task 3. Vorbild im SELBEN File: Ereignis-Chip
> (`verlauf.js:82-84`), Ereignis-Events (`:275-282`), Ereignis-Dialog-HTML (`:125-151`),
> oeffneEvDialog/ok/del (`:209-243`). Spiegle dieses Muster für Medikamente.

- [ ] **Step 1: Imports ergänzen** (oben in verlauf.js)

```js
import { istStrukturierteSpritze, setzeSpritze, entferneSpritze } from '../spritze.js';
```
und `PRAEPARATE, DOSIS_LISTE` aus '../schema.js' ergänzen, `dosisIndex` aus '../db.js' ergänzen.

- [ ] **Step 2: Chip klickbar machen** (verlauf.js:79-81)

Ersetze
```js
      if (t.spritze) {
        chips.push(`<span class="chip med">${icon('pille')}${medText(t.spritze)}</span>`);
      }
```
durch
```js
      if (t.spritze) {
        const bearbeitbar = istStrukturierteSpritze(t.spritze);
        const attr = bearbeitbar
          ? ` med-klick" data-med="${t.datum}" role="button" tabindex="0" title="Medikament bearbeiten`
          : '';
        chips.push(`<span class="chip med${attr}">${icon('pille')}${medText(t.spritze)}</span>`);
      }
```
(Ergebnis: strukturiert → `class="chip med med-klick" data-med=... role=button …`; Rohtext → `class="chip med"` ohne Klick-Attribute.)

- [ ] **Step 3: Zwei Dialoge ins Markup** — nach dem `#v-ev-del-dialog`-Block (verlauf.js:~151), vor dem schließenden Backtick, einfügen:

```js
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
    </div>
```

- [ ] **Step 4: Dialog-Logik** — nach der Ereignis-Dialog-Logik (nach verlauf.js:~243 Block) einen Medikament-Block einfügen, der das Ereignis-Muster spiegelt. Kernpunkte:
  - Refs holen: `#v-med-dialog`, `#v-med-del-dialog`, `#v-med-praep`, `#v-med-dosis`, `#v-med-pen`.
  - Präparat-Segment (wie eingabe.js: Buttons aus `PRAEPARATE`, aktiv-Klasse; bei Wechsel `dosisIdx` auf `DOSIS_LISTE[praep].length-1` klemmen und Dosis neu zeichnen).
  - Dosis-Stepper über `DOSIS_LISTE[praep]` (−/+, Index klemmen), Anzeige via Komma-Format (nutze die im File vorhandene `fmtKg`-Hilfe für Nachkommastellen; ganze Zahlen ok).
  - Pen-Stepper (ganzzahlig, min 1).
  - State im Closure: `aktMedDatum`, `praepWahl`, `dosisIdx`, Pen aus dem Feld.
  - `oeffneMedDialog(datum)`: Spritze aus `ctx.store.get().tageseintraege[datum].spritze` holen; nur öffnen, wenn `istStrukturierteSpritze`; vorbelegen: `praepWahl = spritze.praeparat`, `dosisIdx = dosisIndex(DOSIS_LISTE[praepWahl], spritze.dosis_mg)`, Pen = `spritze.pen_anwendung || 1`; Dialog `.auf`.
  - Speichern (`#v-med-ok`): neue Spritze `{ praeparat: praepWahl, dosis_mg: DOSIS_LISTE[praepWahl][dosisIdx], pen_anwendung: parseInt(penFeld.value,10)||null, historie_rohtext: null }`; `ctx.store.aktualisiere(d => ({ ...d, tageseintraege: setzeSpritze(d.tageseintraege, aktMedDatum, neu) }))` (Default undobar). Dialog zu, State reset.
  - Löschen-Weg (`#v-med-del` → rotes `#v-med-del-dialog` mit Text „**<praep> <dosis> mg** (<formatiereDatum(datum)>) wird vom Tag entfernt. Gewicht bleibt."; `#v-med-del-ok` → `ctx.store.aktualisiere(d => ({ ...d, tageseintraege: entferneSpritze(d.tageseintraege, aktMedDatum) }))`; beide Dialoge zu).
  - Abbrechen-Buttons schließen ohne Änderung.

- [ ] **Step 5: Chip-Events pro baue() verdrahten** — dort, wo die Ereignis-Chip-Events gehängt werden (verlauf.js:~275, Schleife über `.chip.ev`), analog eine Schleife über `.chip.med-klick` ergänzen:
```js
    for (const chip of zeile.querySelectorAll('.chip.med-klick')) {
      chip.addEventListener('click', (e) => { e.stopPropagation(); oeffneMedDialog(chip.dataset.med); });
      chip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); oeffneMedDialog(chip.dataset.med); }
      });
    }
```
(Sicherstellen, dass `oeffneMedDialog` im Scope dieser Verdrahtung sichtbar ist — wie `oeffneEvDialog`.)

- [ ] **Step 6: CSS** — in `app/css/app.css` nach `.v-chips .chip.med` (Zeile 543) ergänzen:
```css
.v-chips .chip.med-klick { border-color: var(--rand-2, var(--fg-3)); cursor: pointer; }
.v-chips .chip.med-klick:active { opacity: .7; }
```
Ziel: grauer Rand am klickbaren Med-Chip (Rand = klickbar; Ereignis blau, Medikament grau, Rohtext randlos). Prüfe, welche graue Rand-Variable im Theme existiert (`--rand`, `--fg-3`, o.ä.) und nimm eine, die in hell UND dunkel sichtbar gegen `var(--rand)`-Hintergrund ist. `.chip.med` nutzt bereits `background:var(--rand)` → der Rand muss einen Tick dunkler/kontrastreicher sein.

- [ ] **Step 7: Deploy-Bump** — `app/js/version.js` '71'→'72' UND `app/sw.js` BUILD '71'→'72'. Verifizieren: `cd app && node -e "import('./js/version.js').then(()=>{const fs=require('fs');const b=/const BUILD = '(\d+)'/.exec(fs.readFileSync('./sw.js','utf8'))[1];console.log('APP',globalThis.APP_VERSION,'BUILD',b,globalThis.APP_VERSION===b?'OK':'MISMATCH');})"` → `APP 72 BUILD 72 OK`.

- [ ] **Step 8: Regression** — `node --test tests/spritze.test.js` (5 grün) + `node -e "import('./app/js/spritze.js').then(()=>console.log('ok'))"`.

- [ ] **Step 9: Commit (NUR Nutzer)** — `app/js/screens/verlauf.js`, `app/css/app.css`, `app/js/version.js`, `app/sw.js`.

---

## Task 3: Browser-Verifikation (Controller selbst, kein Subagent)

> Über `http://localhost:8000/test/`. Cache-Falle: CDP clearBrowserCache + setCacheDisabled + reload{ignoreCache}.

- [ ] Strukturierter Med-Chip hat grauen Rand + ist fokussierbar; Rohtext-Chip (falls in den Daten vorhanden) hat KEINEN Rand und ist nicht klickbar.
- [ ] Klick öffnet Dialog mit korrekt vorbelegtem Präparat/Dosis/Pen.
- [ ] Speichern (anderes Präparat/Dosis/Pen) → Chip-Text im Verlauf aktualisiert.
- [ ] Löschen → roter Bestätigungsdialog → Spritze weg, Gewicht/Zeile bleibt.
- [ ] Undo stellt die Änderung/Löschung wieder her (Undo-Button im Verlauf).
- [ ] Hell + Dunkel: Rand sichtbar; Button-Farben (Speichern hellblau, Löschen rot).
- [ ] Zeilen-Klick (→ Eingabe) feuert NICHT beim Chip-Klick (stopPropagation).

---

## Nach Abschluss (Doku, durch Nutzer committen)
- `docs/BACKLOG.md`: Phase E / Commit 5 auf `[x]`.
- `docs/ENTWICKLER-NOTIZEN.md`: kurzer Merkposten (spritze.js reine Funktionen; DOSIS_LISTE nach schema.js zentralisiert; Med-Chip „med-klick" grauer Rand = klickbar, Rohtext randlos).
- `README.md` Statusblock + Version v72; Phase E dann nur noch Commit 8 (Splash) offen.
- `MEMORY.md` + Projekt-Memory: v72, Commit 5 ✅.
