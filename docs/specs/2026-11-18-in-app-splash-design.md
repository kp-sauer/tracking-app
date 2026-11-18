# In-App-Splash-Screen (Commit 8) — Design

> **Status:** Design abgenommen (2026-11-18). Mockup `mockups/16-splash.html` abgenommen
> (Variante A). Nächster Schritt: Implementierungsplan (writing-plans).
>
> **Backlog-Bezug:** `docs/BACKLOG.md` → Commit 8 (Phase E, Prio 99) — der letzte offene
> Feature-Punkt. Titel-Fix (`<title>`) wird mitgenommen.

## Ziel

Ein eigener **In-App-Splash** beim App-Start, der die kurze Lücke zwischen „Dateien geladen"
und „erster Screen gerendert" mit einem modernen Marken-Auftritt überbrückt — statt eines leeren
`#screen`. Ersetzt NICHT den nativen PWA-Splash des Betriebssystems (der liegt außerhalb unserer
Kontrolle), sondern legt sich als HTML-Overlay darüber bzw. direkt danach.

**Plattform:** reines DOM/CSS/JS → funktioniert auf iPhone (WebKit) UND Android (Chromium)
identisch. Keine plattformspezifische API.

## Abgenommene Gestaltung (Mockup 16, Variante A)

- **Logo:** vorhandenes PWA-Icon `icons/icon-192.png` (blaue Gewichtskurve), abgerundete Ecken.
  Kein neues Asset.
- **Schriftzug:** „Weight**Log**" ("Log" in Akzentfarbe `--akzent`), unter dem Icon.
- **Hintergrund:** folgt dem App-Theme (hell = `--surface` weiß, dunkel = `--surface` fast-schwarz).
- **Animation:** Fade-in von Logo + Wort (Opacity + leichtes Hochgleiten/Skalieren), kurz halten,
  dann Fade-out des gesamten Overlays, das die App freigibt.
- **Dauer:** so kurz wie möglich — Splash verschwindet, sobald die App bereit ist, aber mit einer
  Mindest-Standzeit (~0,7 s), damit die Ein-/Ausblende-Animation nie abgehackt wirkt.
- **Reduced Motion:** bei `prefers-reduced-motion: reduce` ohne Bewegung — nur kurz einblenden
  und entfernen (Barrierefreiheit).

## Komponenten & Änderungen

### 1. Splash-Overlay (Markup)
- In **beiden** `index.html` (`app/index.html` UND `app/test/index.html`) als erstes Element in
  `<body>`: `<div id="splash">` mit `<img>` (Icon) + `<div class="splash-wort">`.
- `position: fixed; inset: 0; z-index` über allem.

### 2. Styling (`app/css/app.css`)
- Nutzt bestehende Theme-Tokens (`--surface`, `--fg`, `--akzent`) → Hintergrund/Schrift schalten
  automatisch mit `data-theme`.
- Zustandsklassen für die Animation: eingeblendet → `#splash.weg` (Fade-out). Nach der Transition
  wird das Element aus dem DOM entfernt (kein Rest, kein Tab-Fang).
- `@media (prefers-reduced-motion: reduce)`: Transitions aus.

### 3. Steuerung (`app/js/main.js`)
- **Entfernen:** Nach `await store.laden()` + erstem `render()` (App ist bereit) den Splash
  ausblenden. Mindest-Standzeit über einen Startzeitpunkt-Vergleich sicherstellen (~0,7 s), damit
  die Animation sauber läuft, auch wenn `laden()` praktisch sofort fertig ist.
- Ausblenden = Klasse `weg` setzen → `transitionend` (oder Timeout-Fallback) → `remove()`.

### 4. Theme früh setzen (behebt Flackern app-weit)
**Problem:** `data-theme` wird heute erst in `render()` → `themeAnwenden()` (main.js) gesetzt, also
NACH dem asynchronen `store.laden()`. Bis dahin gilt der Hell-Default aus `:root`. Im Dunkelmodus
blitzt daher kurz die helle Fläche auf — beim großflächigen Splash besonders sichtbar.

**Lösung:**
- **localStorage-Spiegel:** Beim Theme-Speichern (main.js, Theme-Toggle) wird die effektive Wahl
  zusätzlich synchron in `localStorage` geschrieben (IndexedDB bleibt die Hauptablage; localStorage
  ist nur der schnell lesbare Vorab-Wert). `localStorage` ist origin+pfad-getrennt wie IndexedDB →
  Welt-Trennung Test/Produktiv bleibt gewahrt. Kein Secret, additiv.
- **Inline-`<head>`-Script:** Ganz oben in beiden `index.html`, läuft VOR dem ersten Paint: liest
  den localStorage-Wert; fehlt er (Erststart), Fallback auf `prefers-color-scheme`; setzt
  `data-theme` sofort. **Ziel-Element = `<html>` (`document.documentElement`)**, weil `<body>` zum
  Zeitpunkt eines `<head>`-Scripts noch nicht existiert. Damit das CSS beide Fälle trifft, wird die
  Dunkel-Regel als `:root[data-theme="dunkel"], [data-theme="dunkel"]` geführt bzw. der Selektor
  bleibt elementlos (`[data-theme="dunkel"]` greift auf `<html>` wie auf `<body>`). `main.js` setzt
  `data-theme` weiterhin auf `<body>` — beide Attribute aktiv zu haben ist unkritisch, da der
  elementlose Selektor ohnehin matcht; zur Sauberkeit kann `themeAnwenden()` zusätzlich
  `document.documentElement` mitpflegen (im Plan zu entscheiden).
- **Reine Funktion:** `fruehesTheme(gespeichert, prefersDark) → 'hell' | 'dunkel'` (kapselt die
  Entscheidungslogik, mit node:test testbar). Das Inline-Script ruft sie bzw. ihre Logik auf.
- `render()`/`themeAnwenden()` bleibt die Quelle der Wahrheit und korrigiert das Attribut nach dem
  DB-Laden ohnehin — das Inline-Script ist nur der Vorab-Wert gegen das Aufblitzen. Kein
  Widerspruch.

### 5. Titel-Fix (mitgenommen)
- `<title>tracking-app</title>` → `<title>WeightLog</title>` in beiden `index.html`.
- main.js:13 Test-Titel `'TESTMODUS – tracking-app'` → `'WeightLog [TEST]'` (konsistent mit dem
  PWA-Namen in `manifest.webmanifest`).
- Der interne `<h1>`-Fallback `'tracking-app'` (main.js:79) bleibt unangetastet (nie sichtbar, nur
  theoretischer Fallback).

## Nicht enthalten (bewusst)
- **Nativer iOS-Splash** (`apple-touch-startup-image`): bewusst WEGGELASSEN (aufwändig, ein Bild pro
  Gerätegröße; der In-App-Splash deckt den Zweck plattformgleich ab).
- **Kräftiger blauer Icon-Hintergrund** als Splash-Fläche: verworfen zugunsten Theme-Hintergrund.
- Kein neues Logo-Asset (vorhandenes Icon genügt).

## Testbarkeit
- **Reine Logik:** `fruehesTheme()` per node:test (neben den bestehenden theme.js-Tests oder in
  einer eigenen Datei). Bestehende 208 Tests bleiben grün.
- **DOM/Splash/Timing:** nicht unit-getestet (Projekt testet kein DOM) → Verifikation im Browser
  über `http://localhost:8000/test/` (Cache-Falle: per CDP Cache leeren/deaktivieren +
  reload ignoreCache). Prüfen: Fade-in/out, Mindest-Standzeit, kein Theme-Flackern in hell UND
  dunkel, reduced-motion-Fallback, beide Welten (Test + Produktiv).

## Deploy-Hinweis
- Beim Deploy wie immer Version an ZWEI Stellen gleich hochzählen: `app/js/version.js`
  (`globalThis.APP_VERSION`) UND `BUILD` in `app/sw.js` (v73 → v74). Push macht der Nutzer selbst
  via GitHub Desktop.
