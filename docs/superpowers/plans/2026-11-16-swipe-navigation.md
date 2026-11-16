# Swipe-Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Horizontales Wischen wechselt zwischen den Screens (Übersicht → Eingabe → Charts → Verlauf → Profil), ohne bestehende horizontale Touch-Interaktionen zu stören.

**Architecture:** Neues Modul `app/js/swipe.js` mit zwei reinen, getesteten Funktionen (`swipeRichtung`, `nachbarScreen`) plus einer dünnen, nicht-getesteten DOM-Verdrahtung (`installiereSwipe`) an `#screen`. `main.js` ruft `installiereSwipe` einmalig auf und navigiert über das bestehende `location.hash`-Modell (hartes Umschalten, kein Gleiten). Keine Änderung an `router.js`.

**Tech Stack:** Vanilla JS (ES-Module, kein Build), Tests via `node:test` / `node:assert`. Touch-Events (touchstart/-move/-end), `passive:true`, `closest()` für die Ausschlusszonen.

**Spec:** `docs/specs/2026-11-16-swipe-navigation-design.md`

**Hinweis git:** Der Nutzer macht ALLE Commits und den Push selbst. Die „Commit"-Steps unten sind NICHT von Claude/Subagenten auszuführen — stattdessen am Ende dem Nutzer melden, was bereit zum Committen ist. (Die Step-Blöcke zeigen nur, was in einen Commit gehört.)

---

## File Structure

- **Create `app/js/swipe.js`** — Gesten-Modul. Konstanten `SWIPE_REIHENFOLGE`, `SWIPE_AUSSCHLUSS`; reine Funktionen `swipeRichtung`, `nachbarScreen`; DOM-Verdrahtung `installiereSwipe` (nutzt intern `istAusschlussZiel` via `closest`).
- **Create `tests/swipe.test.js`** — node:test für die reinen Funktionen `swipeRichtung` + `nachbarScreen`. (`installiereSwipe`/`istAusschlussZiel` nicht unit-getestet — dünne DOM-Verdrahtung, Projekt testet keinen DOM.)
- **Modify `app/js/main.js`** — gemeinsame `aktiverScreen()`-Hilfsfunktion (von `render()` und Swipe genutzt); `installiereSwipe(...)` einmalig nach dem ersten `render()`.
- **Modify `app/js/version.js`** (Deploy, letzte Task) — `70` → `71`.
- **Modify `app/sw.js`** (Deploy, letzte Task) — `BUILD` `70` → `71`.

---

## Task 1: Reine Funktion `nachbarScreen`

**Files:**
- Create: `app/js/swipe.js`
- Test: `tests/swipe.test.js`

- [ ] **Step 1: Write the failing test**

Datei `tests/swipe.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nachbarScreen, swipeRichtung, SWIPE_REIHENFOLGE } from '../app/js/swipe.js';

test('SWIPE_REIHENFOLGE ist die lineare 5er-Kette inkl. profil am Ende', () => {
  assert.deepEqual([...SWIPE_REIHENFOLGE],
    ['dashboard', 'eingabe', 'charts', 'verlauf', 'profil']);
});

test('nachbarScreen in der Mitte: links = nächster, rechts = vorheriger', () => {
  assert.equal(nachbarScreen('charts', 'links'), 'verlauf');
  assert.equal(nachbarScreen('charts', 'rechts'), 'eingabe');
});

test('nachbarScreen stoppt an beiden Rändern (kein Wrap)', () => {
  assert.equal(nachbarScreen('dashboard', 'rechts'), null);
  assert.equal(nachbarScreen('profil', 'links'), null);
});

test('nachbarScreen: dashboard links → eingabe, verlauf links → profil', () => {
  assert.equal(nachbarScreen('dashboard', 'links'), 'eingabe');
  assert.equal(nachbarScreen('verlauf', 'links'), 'profil');
  assert.equal(nachbarScreen('profil', 'rechts'), 'verlauf');
});

test('nachbarScreen: unbekannter Screen oder unbekannte Richtung → null', () => {
  assert.equal(nachbarScreen('gibtsnicht', 'links'), null);
  assert.equal(nachbarScreen('charts', 'hoch'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/swipe.test.js`
Expected: FAIL — `Cannot find module '../app/js/swipe.js'` (Datei existiert noch nicht).

- [ ] **Step 3: Write minimal implementation**

Datei `app/js/swipe.js`:

```js
// Gesten-Modul für Screen-Swipe. Reine Funktionen (getestet) + dünne DOM-Verdrahtung.

// Lineare Swipe-Kette. Bewusst eigene Konstante statt router.SCREENS:
// die Tab-Leiste listet 'profil' NICHT, der Swipe hat es als letztes Glied dazu.
// 'onboarding' ist absichtlich NICHT enthalten (Swipe dort aus).
export const SWIPE_REIHENFOLGE = Object.freeze([
  'dashboard', 'eingabe', 'charts', 'verlauf', 'profil'
]);

// Nachbar in der Kette: 'links' = ein Schritt vorwärts (nächster Screen),
// 'rechts' = ein Schritt zurück. null am Rand oder bei unbekannter Eingabe.
export function nachbarScreen(aktuell, richtung) {
  const i = SWIPE_REIHENFOLGE.indexOf(aktuell);
  if (i === -1) return null;
  const delta = richtung === 'links' ? 1 : richtung === 'rechts' ? -1 : null;
  if (delta === null) return null;
  const j = i + delta;
  return (j >= 0 && j < SWIPE_REIHENFOLGE.length) ? SWIPE_REIHENFOLGE[j] : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/swipe.test.js`
Expected: PASS (5 Tests grün).

- [ ] **Step 5: Commit (NUR Nutzer)**

Gehört in einen Commit:
```
app/js/swipe.js
tests/swipe.test.js
```
Commit-Botschaft-Vorschlag: `feat(swipe): nachbarScreen + SWIPE_REIHENFOLGE (reine Logik)`

---

## Task 2: Reine Funktion `swipeRichtung`

**Files:**
- Modify: `app/js/swipe.js`
- Test: `tests/swipe.test.js`

- [ ] **Step 1: Write the failing test**

Ans Ende von `tests/swipe.test.js` anhängen (der Import von `swipeRichtung` steht
bereits oben in der Import-Zeile aus Task 1):

```js
// start/ende = {x, y, t} (t = Zeitstempel ms). Schwellen-Defaults: dist>50, |dx|>=2|dy|, dauer<500.
test('swipeRichtung: klarer Links-Wisch (Finger nach links) → "links"', () => {
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 200, y: 110, t: 150 }), 'links');
});

test('swipeRichtung: klarer Rechts-Wisch (Finger nach rechts) → "rechts"', () => {
  assert.equal(swipeRichtung({ x: 100, y: 100, t: 0 }, { x: 220, y: 90, t: 150 }), 'rechts');
});

test('swipeRichtung: zu kurze Strecke (<=50px) → null', () => {
  assert.equal(swipeRichtung({ x: 200, y: 100, t: 0 }, { x: 160, y: 100, t: 100 }), null);
});

test('swipeRichtung: zu vertikal (Dominanz |dx|>=2|dy| verfehlt) → null', () => {
  // dx=-60, dy=40 → 60 < 2*40=80 → keine horizontale Dominanz
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 240, y: 140, t: 150 }), null);
});

test('swipeRichtung: zu langsam (>=500ms) → null', () => {
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 180, y: 100, t: 600 }), null);
});

test('swipeRichtung: Grenzfall genau an 2:1-Dominanz zählt (dx=-80, dy=40)', () => {
  // |dx|=80 >= 2*|dy|=80 → erfüllt; dist 80>50; schnell → "links"
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 220, y: 140, t: 150 }), 'links');
});

test('swipeRichtung: Schwellen überschreibbar', () => {
  // mit dist-Schwelle 200 ist ein 120px-Wisch zu kurz → null
  assert.equal(
    swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 180, y: 100, t: 150 }, { minDist: 200 }),
    null
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/swipe.test.js`
Expected: FAIL — `swipeRichtung` ist nicht exportiert (`The requested module ... does not provide an export named 'swipeRichtung'`).

- [ ] **Step 3: Write minimal implementation**

In `app/js/swipe.js` nach `nachbarScreen` einfügen:

```js
// Standard-Schwellen für die Swipe-Erkennung (am Gerät justierbar).
export const SWIPE_SCHWELLEN = Object.freeze({
  minDist: 50,     // Mindest-Wischweite horizontal (px)
  dominanz: 2,     // |dx| muss >= dominanz * |dy| sein (trennt von vertikalem Scroll)
  maxDauer: 500    // ms; langsamer = kein Swipe (Ziehen/Halten)
});

// Wertet eine Geste aus. start/ende = {x, y, t}. Liefert 'links' | 'rechts' | null.
// 'links'  = Finger nach links (dx < 0) → in der Kette ein Schritt vorwärts.
// 'rechts' = Finger nach rechts (dx > 0) → ein Schritt zurück.
export function swipeRichtung(start, ende, schwellen = {}) {
  const { minDist, dominanz, maxDauer } = { ...SWIPE_SCHWELLEN, ...schwellen };
  const dx = ende.x - start.x;
  const dy = ende.y - start.y;
  const dauer = ende.t - start.t;
  if (dauer >= maxDauer) return null;
  if (Math.abs(dx) <= minDist) return null;
  if (Math.abs(dx) < dominanz * Math.abs(dy)) return null;
  return dx < 0 ? 'links' : 'rechts';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/swipe.test.js`
Expected: PASS (alle Tasks 1+2 Tests grün, 12 Tests).

- [ ] **Step 5: Commit (NUR Nutzer)**

Gehört in einen Commit:
```
app/js/swipe.js
tests/swipe.test.js
```
Commit-Botschaft-Vorschlag: `feat(swipe): swipeRichtung mit justierbaren Schwellen`

---

## Task 3: DOM-Verdrahtung `installiereSwipe` + Ausschlusszonen

**Files:**
- Modify: `app/js/swipe.js`

> Keine Unit-Tests: `installiereSwipe` und `istAusschlussZiel` sind dünne
> DOM-Verdrahtung (Touch-Events, `closest()`). Das Projekt testet bewusst keinen
> DOM (vgl. `charts.js`-Event-Registrierung ist auch untested). Verifikation
> erfolgt im Browser (Task 5) und am Gerät (Nutzer).

- [ ] **Step 1: Ausschluss-Konstante + Helper einfügen**

In `app/js/swipe.js` nach den Konstanten (vor/nach `nachbarScreen`) einfügen:

```js
// Horizontale Interaktionszonen: startet die Geste hier, zählt sie NICHT als Swipe.
// Eine Stelle für alle solchen Zonen (bei neuen horizontalen Elementen hier ergänzen).
//  .u-over      = uPlot-Chartfläche (Tap→Vollbild + Scrubbing, charts.js)
//  .tage-pills  = scrollbare Tage-Pills (charts.js, dashboard.js)
//  .jahr-leiste = scrollbare Jahr-Pills (verlauf.js)
//  .datum-picker = geöffnetes Datums-Rädchen (felder.js) – zugeklappte .datum-anzeige NICHT
export const SWIPE_AUSSCHLUSS = Object.freeze([
  '.u-over', '.tage-pills', '.jahr-leiste', '.datum-picker'
]);

// true, wenn el (oder ein Vorfahr) in einer Ausschlusszone liegt. Dünne DOM-Helfer-
// funktion über closest(); nicht unit-getestet (closest ist Browser-API).
function istAusschlussZiel(el) {
  if (!el || typeof el.closest !== 'function') return false;
  return SWIPE_AUSSCHLUSS.some(sel => el.closest(sel));
}
```

- [ ] **Step 2: `installiereSwipe` einfügen**

Ans Ende von `app/js/swipe.js` anhängen:

```js
// Hängt die Swipe-Erkennung an 'ziel' (= #screen). Bubble-Phase, passive:true →
// es wird NIE preventDefault gerufen, vertikales Scrollen bleibt unberührt.
//  optionen.aktuellerScreen() → aktueller Screen-Name (frisch aus dem Routing)
//  optionen.navigiere(screen) → führt den Screen-Wechsel aus (location.hash)
//  optionen.aktiv()           → false im Onboarding (dann kein Swipe)
// Rückgabe: Abmelde-Funktion (entfernt die Listener wieder).
export function installiereSwipe(ziel, { aktuellerScreen, navigiere, aktiv }) {
  let start = null;       // {x, y, t}
  let verworfen = false;  // true bei Multitouch oder Start in Ausschlusszone

  const onStart = (ev) => {
    if (aktiv && !aktiv()) { verworfen = true; return; }
    if (!ev.touches || ev.touches.length !== 1) { verworfen = true; return; }
    if (istAusschlussZiel(ev.target)) { verworfen = true; return; }
    const t = ev.touches[0];
    start = { x: t.clientX, y: t.clientY, t: Date.now() };
    verworfen = false;
  };

  const onMove = (ev) => {
    // Zweitfinger während der Geste (Pinch) → verwerfen.
    if (ev.touches && ev.touches.length > 1) verworfen = true;
  };

  const onEnd = (ev) => {
    if (verworfen || !start) { start = null; return; }
    const t = ev.changedTouches && ev.changedTouches[0];
    if (!t) { start = null; return; }
    const ende = { x: t.clientX, y: t.clientY, t: Date.now() };
    const richtung = swipeRichtung(start, ende);
    start = null;
    if (!richtung) return;
    const ziel2 = nachbarScreen(aktuellerScreen(), richtung);
    if (ziel2) navigiere(ziel2);
  };

  ziel.addEventListener('touchstart', onStart, { passive: true });
  ziel.addEventListener('touchmove', onMove, { passive: true });
  ziel.addEventListener('touchend', onEnd, { passive: true });

  return () => {
    ziel.removeEventListener('touchstart', onStart);
    ziel.removeEventListener('touchmove', onMove);
    ziel.removeEventListener('touchend', onEnd);
  };
}
```

- [ ] **Step 3: Regressionslauf (reine Funktionen unverändert grün)**

Run: `node --test tests/swipe.test.js`
Expected: PASS (12 Tests weiter grün — neue Exporte brechen nichts).

- [ ] **Step 4: Syntax-/Import-Smoke-Test**

Run: `node -e "import('./app/js/swipe.js').then(m => console.log(Object.keys(m).sort().join(',')))"`
Expected: Ausgabe enthält `SWIPE_AUSSCHLUSS,SWIPE_REIHENFOLGE,SWIPE_SCHWELLEN,installiereSwipe,nachbarScreen,swipeRichtung` (Modul lädt fehlerfrei).

- [ ] **Step 5: Commit (NUR Nutzer)**

Gehört in einen Commit:
```
app/js/swipe.js
```
Commit-Botschaft-Vorschlag: `feat(swipe): installiereSwipe + Ausschlusszonen (DOM-Verdrahtung)`

---

## Task 4: Verdrahtung in `main.js`

**Files:**
- Modify: `app/js/main.js`

- [ ] **Step 1: Import ergänzen**

In `app/js/main.js`, bei den Imports (nach Zeile 7 `import { screens } ...`) einfügen:

```js
import { installiereSwipe } from './swipe.js';
```

- [ ] **Step 2: Gemeinsame `aktiverScreen()`-Hilfsfunktion einführen**

In `app/js/main.js` die `render()`-Funktion so anpassen, dass die Screen-Bestimmung
in eine wiederverwendbare Funktion wandert. Ersetze in `render()` die Zeilen

```js
  const daten = store.get();
  let screen = routeAusHash(location.hash);
  if (!daten.profil) screen = 'onboarding';
```

durch:

```js
  const daten = store.get();
  const screen = aktiverScreen();
```

und füge oberhalb von `function render()` (nach `function navigiere(...)`, Zeile 62) ein:

```js
// Aktueller Screen aus Hash + Onboarding-Fallback. Eine Quelle für render() UND Swipe,
// damit beide garantiert denselben Screen sehen.
function aktiverScreen() {
  if (!store.get().profil) return 'onboarding';
  return routeAusHash(location.hash);
}
```

- [ ] **Step 3: `installiereSwipe` nach dem ersten `render()` aufrufen**

In `app/js/main.js` ganz unten, NACH `render();` (aktuell Zeile 92) und vor der
Service-Worker-Registrierung, einfügen:

```js
// Swipe-Navigation zwischen den Screens (nur wenn ein Profil existiert → nicht im Onboarding).
installiereSwipe(document.getElementById('screen'), {
  aktuellerScreen: aktiverScreen,
  navigiere,
  aktiv: () => !!store.get().profil
});
```

- [ ] **Step 4: Syntax-/Import-Smoke-Test**

Run: `node -e "import('./app/js/router.js').then(()=>import('./app/js/swipe.js')).then(()=>console.log('module-graph ok'))"`
Expected: `module-graph ok` (swipe.js + router.js laden ohne Syntaxfehler).

> Hinweis: `main.js` selbst lässt sich nicht in node importieren (greift auf
> `document`/`window` zu) — die echte Prüfung ist der Browser-Test in Task 5.

- [ ] **Step 5: Commit (NUR Nutzer)**

Gehört in einen Commit:
```
app/js/main.js
```
Commit-Botschaft-Vorschlag: `feat(swipe): in main.js verdrahten (aktiverScreen gemeinsam)`

---

## Task 5: Browser-Verifikation (grobe Funktionsprüfung)

**Files:** keine Änderung — Verifikation.

> Testumgebung: `http://localhost:8000/test/`. Server ggf. starten:
> `cd app && python -m http.server 8000`. **Cache-Falle:** nach JS-Änderungen per CDP
> `Network.clearBrowserCache` + `Network.setCacheDisabled{true}` + `Page.reload{ignoreCache:true}`
> erzwingen (python http.server sendet keine Cache-Header — siehe ENTWICKLER-NOTIZEN).
> Claudes Playwright-Browser hat eine eigene, meist leere IndexedDB → zeigt oft das
> Onboarding. Für den Swipe-Test muss ein Profil existieren; entweder Onboarding
> durchklicken oder ein Minimal-Profil per Console setzen.

- [ ] **Step 1: Seite laden, Cache leeren, Profil sicherstellen**

Playwright: navigiere zu `http://localhost:8000/test/`, CDP-Cache leeren + reload
ignoreCache. Falls Onboarding erscheint: Stammdaten einmal durchklicken bis die
Tab-Leiste sichtbar ist (Profil existiert).

- [ ] **Step 2: Swipe-Links/Rechts simulieren und Hash prüfen**

Da Playwright-Touch das Gerät nicht zuverlässig abbildet, Gesten direkt per
dispatchEvent feuern. Ausführen (Playwright `evaluate`):

```js
() => {
  const el = document.getElementById('screen');
  const touch = (typ, x, y) => el.dispatchEvent(new TouchEvent(typ, {
    bubbles: true, cancelable: true,
    touches: typ === 'touchend' ? [] : [{ clientX: x, clientY: y }],
    changedTouches: [{ clientX: x, clientY: y }]
  }));
  location.hash = '#/dashboard';
  // Links-Wisch (Finger 300→180, schnell) → erwartet eingabe
  touch('touchstart', 300, 200); touch('touchmove', 240, 205); touch('touchend', 180, 205);
  return location.hash;
}
```

Expected: `#/eingabe` (Swipe-Links von dashboard). Analog Rechts-Wisch (180→300)
zurück → `#/dashboard`.

> Falls `TouchEvent`-Konstruktor im Chromium-Kontext keine `touches` mit Plain-Objects
> akzeptiert, stattdessen die Handler-Logik über ein synthetisches Event mit
> `{ touches:[{clientX,clientY}], changedTouches:[...] }` via `Object.assign(new Event(...), …)`
> feuern. Ziel ist nur: Hash wechselt korrekt.

- [ ] **Step 3: Ränder + Onboarding-Gate prüfen**

- `location.hash='#/dashboard'` → Rechts-Wisch → Hash bleibt `#/dashboard` (Sackgasse).
- `location.hash='#/profil'` → Links-Wisch → bleibt `#/profil` (Sackgasse).
- Profil temporär entfernen (Console: Store-Profil null / Onboarding erzwingen) →
  Wisch ändert den Hash NICHT (Gate `aktiv()`).

- [ ] **Step 4: Ausschlusszone grob prüfen**

Auf dem Charts-Screen (`#/charts`) einen Links-Wisch mit `touchstart`-Target INNERHALB
`.u-over` feuern (Target explizit setzen) → Hash bleibt `#/charts` (Geste verworfen).

- [ ] **Step 5: Ergebnis festhalten**

Beobachtungen notieren (was grün, was nicht). KEIN Commit (nur Verifikation).
**Verbindliche Abnahme am echten Gerät durch den Nutzer** (Swipe-Gefühl, Schwellen,
Konfliktfreiheit Chart/Pills) — Playwright kann das nicht ersetzen.

---

## Task 6: Deploy-Vorbereitung (Version hochzählen)

**Files:**
- Modify: `app/js/version.js`
- Modify: `app/sw.js`

> Erst ausführen, wenn Tasks 1–5 fertig und der Code für den Nutzer abgenommen ist.
> **Beide Stellen MÜSSEN gleich sein** (sw.js hat eine Selbstkontroll-Warnung).

- [ ] **Step 1: `version.js` hochzählen**

In `app/js/version.js` die Zeile
```js
globalThis.APP_VERSION = '70';
```
ändern zu:
```js
globalThis.APP_VERSION = '71';
```

- [ ] **Step 2: `sw.js` BUILD hochzählen**

In `app/sw.js` die Zeile
```js
const BUILD = '70';
```
ändern zu:
```js
const BUILD = '71';
```

- [ ] **Step 3: Gleichheit verifizieren**

Run: `cd app && node -e "import('./js/version.js').then(()=>{const fs=require('fs');const sw=fs.readFileSync('./sw.js','utf8');const b=/const BUILD = '(\d+)'/.exec(sw)[1];console.log('APP',globalThis.APP_VERSION,'BUILD',b, globalThis.APP_VERSION===b?'OK':'MISMATCH');})"`
Expected: `APP 71 BUILD 71 OK`.

- [ ] **Step 4: Commit (NUR Nutzer)**

Gehört in einen Commit:
```
app/js/version.js
app/sw.js
```
Commit-Botschaft-Vorschlag: `chore: v71 (Swipe-Navigation)`

---

## Nach Abschluss (Doku)

- `docs/BACKLOG.md`: Phase E, Commit 6 (Swipe-Navigation) auf `[x]` setzen.
- `docs/ENTWICKLER-NOTIZEN.md`: kurzer Technik-Merkposten (swipe.js: reine Funktionen
  + Ausschlussliste `SWIPE_AUSSCHLUSS`; `aktiverScreen()` gemeinsam genutzt; Geräte-Abnahme).
- `README.md` Statusblock: Swipe-Navigation ergänzen, Version v71.
- `MEMORY.md`: Versionsnummer v70 → v71, Phase E Restpunkte (Commit 5 + 8) aktualisieren.

Diese Doku-Änderungen können in Task 6s Commit oder einen eigenen — **durch den Nutzer**.
