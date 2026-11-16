# Entwickler-Notizen (Arbeitsweise & Technik-Merkposten)

> **Was ist das hier?** Diese Datei ist die „Pass-hier-auf"-Ebene für alle, die am Code arbeiten:
> die abgenommene **Arbeitsweise**, das zentrale **Design-System** und — am wichtigsten — die
> **Technik-Merkposten** (teuer erkaufte Fallen, in die man nicht erneut tappen soll).
>
> **Produktkonzept, Datenquelle und „was ist fertig" stehen im [`README.md`](../README.md)**, nicht
> hier. Der Screen-Status wird bewusst NICHT mehr dupliziert (lebte früher hier als Tabelle →
> driftete gegen das README). Einzige Quelle für Produkt-/Statusinfos: das README.
>
> Entstanden aus der Design-/UX-Feintuning-Session (ab 2026-10-15). **Das Feintuning ist
> abgeschlossen** — alle Screens (Fundament, Profil, Übersicht, Eingabe, Charts, Verlauf) sind
> fertig & browser-verifiziert. Weitere Arbeit = darüber hinausgehende Features/Bugfixes bzw. der
> Backlog in [`BACKLOG.md`](BACKLOG.md).

## Arbeitsweise (wichtig für Wiedereinstieg)
- **Design-Richtung (abgenommen):** clean & minimalistisch, iOS-artig. Farben zurückhaltend —
  Weiß/Grau als Basis, **Blau (#2563eb hell / #4f93f5 dunkel) als einziger Akzent**; weitere
  Farben dosiert nur bei Daten/Charts. Viele Daten modern/grafisch aufbereiten (KPI-Tiles,
  Fortschritt), aber ruhig.
- **Mockup-Schleife:** Vor jedem Screen-Umbau ein eigenständiges HTML-Mockup in `mockups/`
  (per `.gitignore` ausgeschlossen, Wegwerf). Nutzer sieht/entscheidet am Bild → dann Umsetzung
  in die echte App → Browser-Verifikation durch Claude (Playwright).
- **Browser-Verifikation IMMER über die laufende Testumgebung `http://localhost:8000/test/`**
  (hat echte Daten). KEINE eigenen Server/Dummy-Daten. (Server starten, falls aus:
  `cd app && python -m http.server 8000`.) Claudes Playwright-Browser ist eine SEPARATE Instanz
  mit eigener, meist leerer IndexedDB — zeigt daher oft das Onboarding; das ist normal und kein
  Datenverlust beim Nutzer (dessen Daten liegen in seinem eigenen Browser).
- Jede Änderung läuft über einen Implementer-Subagenten (TDD wo testbar), danach Browser-Check.
  Commits im Repo; **Push macht der Nutzer selbst via GitHub Desktop** (Repo:
  https://github.com/kp-sauer/tracking-app, privat).

## Design-System (zentral in app/css/app.css)
- **Farb-Tokens** für Hell + Dunkel (eigene Dark-Werte, keine Invertierung). Chart-Farben pro
  Modus gegen die jeweilige Surface validiert (behebt den alten Dark-Mode-Chart-Bug).
- **Spacing-System (4px-Raster):** `--sp-1..--sp-6` (4/8/12/16/24/32) + abgeleitete
  `--screen-pad-x/-top`, `--karten-gap`, `--karten-pad`. ALLE Abstände darüber — ein Ort für alle
  Screens.
- **Karten:** `.karte` = weiß/`--surface`, `--radius` (16px), `--schatten`. Basis-Regel ist
  gesetzt (war mal vergessen → Karten unsichtbar; gefixt in e5f917c).
- **Kopfzeile:** zeigt dynamisch den Screen-Namen (28px, iOS); Test-Welt = dezentes oranges
  **TEST-Badge** daneben (nicht mehr voller Balken). Theme-Toggle (Mond/Sonne, Feather-SVG) +
  Profil-Icon rechts.
- **Tab-Leiste unten:** Übersicht · Eingabe · Diagramme · Verlauf (mit Text-Labels, Icon über
  Label). Start-Screen beim Öffnen = Übersicht.
- **Eingabe-Komponenten** (`app/js/felder.js`, wiederverwendbar): `geschlechtSegment` (Segmented-
  Control, aktiv = blau gefüllt), `datumsPicker` (eigener Rädchen-Picker Tag/Monat/Jahr → ISO,
  Schaltjahr-korrekt; Logik getestet in tests/felder.test.js). Segmented-Control-Styles `.seg`.

## Undo/Redo (app-weit, session-only)
Im Store (`store.js`, nutzt reine `undo.js`): Snapshot-Stacks im Speicher (NICHT persistiert → überlebt Reload nicht). `aktualisiere(fn, {undobar})` — Default `undobar:true` (pusht alten Stand, leert Redo). **Nur Datenänderungen** sind undobar (Tageseinträge/Ereignisse). `{undobar:false}` an allen Profil-/Theme-/Skala-/Ziel-/Backup-Autosaves (profil.js, main.js). **Import leert den Undo-Verlauf** (`leereHistorie()`). API: `undo()`/`redo()`/`kannUndo()`/`kannRedo()`/`leereHistorie()`. Buttons `#undo-btn`/`#redo-btn` in BEIDEN index.html, in main.js nur bei `screen==='verlauf'` sichtbar + disabled je nach `kannUndo/kannRedo`.

## Offene Feintuning-Reste (nicht blockierend, bewusst vertagt)
1. ~~**Service-Worker-Caching:** Updates kommen zäh an.~~ ✅ ERLEDIGT (2026-10-15): SW auf
   **network-first für App-Dateien** umgestellt (vendor/ bleibt cache-first). `skipWaiting`/
   `clients.claim` waren schon da. Routing-Entscheidung als pure Funktion `strategieFuer(pathname)`
   in `app/js/sw-strategie.js` ausgelagert + per node:test geprüft (sw.js dupliziert sie bewusst,
   da klassischer Worker ohne type:module → kein ES-import). Hinweis: SW registriert NUR in der
   Produktiv-Welt (`/`), NICHT in der Test-Welt (`/test/`) — dort ist `register('sw.js')` relativ
   zum Dokument → 404 (main.js:67). War schon immer so, kein Regress; SW-Verifikation daher über
   `http://localhost:8000/` statt `/test/`.
2. **Statusmeldung** (Profil: nach Speichern/Import) verschwindet durch Store-Re-Render. Lösen,
   wenn die Backup-Funktion im Detail getestet wird.
3. **Backup-Bereich** (Profil) feintunen, sobald Funktion im Detail getestet wird (Nutzer-Wunsch).
4. ~~**Ereignisse einzeln löschen fehlt.**~~ ✅ ERLEDIGT (2026-10-16): Ereignisse lassen sich jetzt
   im Verlauf über klickbare Chips bearbeiten UND löschen (Overlay mit Kategorie/Von/Bis/Notiz,
   rote Bestätigung zum Löschen, beides undobar). Reine Funktionen `aktualisiereEreignis`/
   `entferneEreignis` in ereignisse.js (getestet). Im Browser verifiziert (hell + dunkel,
   Überlappung, Undo/Redo, mehrtägige Ereignisse).

> Offener Feinschliff-Punkt Eingabe (nicht blockierend): Datum/Von/Bis nutzen den bestehenden
> `datumsPicker` → erscheinen als **blaue Pille** (im Mockup 08-1 war's dezentes Grau). Bewusst so
> für Konsistenz mit dem Profil; falls gewünscht beim nächsten Feintuning auf Mockup-Grau umstellbar.

## Technik-Merkposten
- **App-Version: beim Deploy ZWEI Stellen hochzählen** (seit 2026-11-16, korrigiert nach SW-Bug):
  `app/js/version.js` (`globalThis.APP_VERSION = '<nr>';`) UND `BUILD` in `app/sw.js` — beide müssen
  GLEICH sein (sw.js hat eine Selbstkontroll-Warnung bei Abweichung). version.js speist UI-Fußzeile
  („WeightLog v<nr>") und SW-Cache-Name (`tracking-shell-v<nr>`); sw.js lädt sie per
  `importScripts('js/version.js')`, main.js per Seiteneffekt-`import`.
  - **Fallstrick 1 (verifiziert):** version.js darf KEIN `export` enthalten — klassischer SW (kein
    `type:module`) wirft bei `importScripts` sonst „Unexpected token 'export'". Nur `globalThis.…`.
  - **Fallstrick 2 — der SW-Update-Bug (realer Vorfall v63–v69!):** Der Browser installiert einen neuen
    Service Worker NUR, wenn sich `sw.js` SELBST byteweise ändert. Als der Cache-Name via `importScripts`
    aus version.js kam, blieb sw.js bei Versionswechseln unverändert → KEIN SW-Update → alte Version klebte
    am Gerät fest (am Server lag längst die neue). Deshalb die literale `BUILD`-Zeile in sw.js: sie erzwingt
    den Byte-Unterschied. Darum MUSS BUILD mit hochgezählt werden. (Früher war der Cache-Name hart in sw.js
    → änderte sich automatisch; mit der Zentralisierung ging dieser Nebeneffekt verloren.)
- **Charts Touch-Cursor (uPlot v1.6.31 hat KEINEN Touch-Support)** (seit 2026-11-16, Phase F): Auf dem
  Gerät folgt der Cursor dem Finger nicht und liegt versetzt. Zwei Fix-Versuche an einem eigenen
  Touch-Handler für die Normalansicht scheiterten am echten Android (u.a. UI-`zoom` verfälscht die
  Koordinaten; Playwright-Touch-Emulation bildet das Gerät NICHT zuverlässig ab → nur am Gerät testen!).
  **Gelöste Lösung:** Normalansicht = sauberer **Tap → Vollbild** (touchstart/-move/-end in Capture-Phase,
  Bewegung <12px & Dauer <400ms, sonst kein Auslösen → Scrollen bleibt möglich). Im **Vollbild** ein
  eigener Touch-Handler (`plot.setCursor`, Position frisch aus `.u-over`-Rect, Zoom-Korrektur
  `offsetWidth/rect.width`) → Antippen UND Ziehen folgen dem Finger. Handler wird in `zeichnePlot()` je
  nach `vollbild`-Zustand gehängt und verschwindet mit dem alten `.u-over` beim Re-Draw (kein Leak).
- **Zeitzonen/„heute" IMMER lokal, nie UTC** (seit 2026-11-16): `heuteLokal()` in calc.js nutzt
  `getFullYear/getMonth/getDate` (lokale Datums-Komponenten). NICHT `new Date().toISOString().slice(0,10)`
  — das ist UTC und schlägt östlich von UTC (DE +1, Palau +9) morgens auf den Vortag um (realer Bug im
  Urlaub). Gegenbeispiel-Merker: reine Datums-ARITHMETIK auf schon-ISO-Strings (Tag±n, Wochentag, KW) nutzt
  weiterhin bewusst `Date.UTC(...)` (zeitzonen-unabhängig korrekt) — die NICHT auf lokal umstellen.
- **Charts-Zeitfilter „zeitraum"** (seit 2026-11-16): `imZeitfenster(tage, {modus:'zeitraum', von, bis})`
  filtert `von ≤ datum ≤ bis` (ISO-Lexikografie), Fallback auf alle Tage wenn von/bis fehlt. Das
  Charts-Segment ist jetzt `Gesamt · Jahr · Tage · Zeitraum`; Tage-Pills `30·60·90·180·+` (Konstante
  `TAGE_STUFEN`). Die seg-Leiste schaltet dynamisch `.seg-kompakt` (grau, einzeilig) ↔ blaue Umrandung
  (Umbruch) per ResizeObserver; im Nicht-kompakt-Zustand `flex-wrap:wrap`. In der Zeitraum-Ansicht öffnen
  Von/Bis-Picker GEMEINSAM (zentraler Capture-Klick, der den datumsPicker-Einzel-Toggle unterdrückt).
- **Geschlecht-Segment volle Breite** (seit 2026-11-16, Phase C): Die Geschlecht-Zeile im Profil nutzt
  das `zeile-datum`-Muster (`.zeile-geschlecht` + `flex-wrap:wrap`, Label oben, `.seg-voll` über die
  volle Kartenbreite darunter) — NICHT die enge rechte `.ctrl`-Spalte (dort wurde immer gekürzt, auch
  auf dem Handy). Die drei Chips: `flex:1 1 0; min-width:0;` auf `.seg` mit `flex-wrap:nowrap` → teilen
  sich die Zeile zu Dritteln, brechen NIE um. `geschlechtSegment` (felder.js) zeigt die Geschlecht-Icons
  (♂/♀/⚥) IMMER vor dem Label; der ResizeObserver tauscht nur noch langes Label ↔ Kürzel (M/W/D), greift
  real erst bei ~320px. Im Onboarding sitzt das Segment schon in einem vollbreiten `<div>` → dort keine
  Sonderbehandlung nötig. (Merke: bei `flex:1`-Buttons ist `offsetWidth` die geflexte, NICHT die
  benötigte Breite — Umbruch/Abschneiden immer per `scrollWidth` bzw. `offsetTop`-Zeilen prüfen.)
- **Verlauf Jahr-Filter + Re-Render** (seit 2026-11-16, Phase D): `renderVerlauf` baut jetzt über eine
  innere `baue()`-Funktion (wie dashboard.js/charts.js) und re-rendert bei Jahr-Klick → ALLE Events
  (Lösch-/Ereignis-Dialoge, Chip-Klicks, Edit/Delete, Zeilen-Klick) werden pro `baue()` neu verdrahtet.
  Jahr-Leiste `.jahr-leiste` (Pills, `overflow-x:auto`, `scrollbar` versteckt), Jahre ABSTEIGEND
  (`datenJahre(daten).reverse()`), „Alle" zuerst/Default. **Wichtig:** `vortagesDifferenzen` immer auf den
  GESAMTdaten rechnen, nur die Anzeige-Liste aufs Jahr filtern (sonst springt die Differenz des ersten
  gefilterten Tages). **`datenJahre` lebt jetzt zentral in `db.js`** (war doppelt in dashboard.js +
  charts.js) — von dort importieren, NICHT neu lokal definieren.
- SW-Cache-Name wird bei jeder CSS/JS-Änderung hochgezählt — **ab 2026-11-16 zentral über `version.js`**
  (siehe oben), nicht mehr direkt in app/sw.js.
- **Charts-Vollbild-Höhe (gelöst):** Die uPlot-Höhe im Vollbild NICHT fest aus `window.innerHeight`
  rechnen (riet falsch → Chart zu hoch, Karte zu schmal, Overflow nach unten, Serien-Chips ins
  Diagramm gedrückt/unbenutzbar — v. a. auf breitem Desktop-Querformat). Lösung: Höhe aus dem real
  verfügbaren Flex-Platz messen (`host.clientHeight` − Padding) + `requestAnimationFrame`-Nachmessung
  (`plot.setSize`), falls das Layout beim ersten Zeichnen noch nicht final ist. CSS: Vollbild-Container
  `overflow:hidden`, `.chart-flaeche` `flex:1 1 auto; min-height:0`, `.serie-chips` `flex:none`.
- **CSS-Spezifitätsfalle `#screen button`:** Die generische Regel `#screen button:not([type="submit"])`
  hat Spezifität (1,1,1) — der `:not()` zählt als Pseudoklasse. Jede Button-Variante im `#screen`
  (Dialog-Buttons `.primär`/`.gefahr`, `.stepper-v`, `.v-akt`) muss MINDESTENS (1,1,1) erreichen, sonst
  gewinnt die generische Regel (blau/Rand). Lösung: Element mitnehmen (`#screen button.v-akt`) oder
  tiefer verschachteln (`#screen .dialog .d-btns button.gefahr`). War Ursache für zwei Bugs: Dialog-
  Löschen/Überschreiben-Button blau statt rot/orange, und Verlauf-Edit/✕ blau statt grau. (Der Eingabe-
  Überschreiben-Dialog war davon schon vorher betroffen, nur nie visuell geprüft — bei Dialog-Tests
  IMMER die Button-FARBE messen, nicht nur Text/Logik.)
- **Ereignis-Dublette (geklärt, KEIN aktueller Bug):** Es kann vorkommen, dass zwei Ereignisse gleicher
  Kategorie denselben Starttag haben (z.B. zwei „wiesn" mit von=15, bis=16 bzw. bis=17) → am 15. zwei
  gleiche Chips im Verlauf. Ursache sind ALTDATEN aus einer Code-Version VOR dem Dubletten-Fix
  (`setzeTagesereignis`). Der aktuelle Code ERSETZT beim Speichern korrekt (von===datum) und erzeugt
  solche Dubletten NICHT mehr — im Browser verifiziert (2× am selben Tag mit unterschiedlichem Bis
  gespeichert → bleibt EIN Ereignis). Bereinigung von Altlasten derzeit nur per Browser-Console
  (DB `tracking-app-test`/`tracking-app`, store `daten`, key `haupt`, Feld `ereignisse` filtern).
- **Browser-Verifikation / Cache-Falle (wichtig):** Der Testserver `python -m http.server 8000`
  sendet KEINE Cache-Control-Header → Chromium cached ES-Module UND CSS hartnäckig unter ihrer URL (ohne
  Query). Nach JS/CSS-Änderungen zeigt der Playwright-Browser sonst alte Dateien (Symptom: `#screen`
  bleibt leer / „does not provide an export …" / alte Styles trotz korrekter Datei;
  `fetch('/js/x.js')` liefert alt, `fetch('/js/x.js?v='+Date.now())` liefert neu). Lösung bei der
  Verifikation: CDP `Network.clearBrowserCache` + `Network.setCacheDisabled{true}` + `Page.reload{ignoreCache:true}`.
  SW ist dabei NICHT die Ursache (registriert nur unter `/`, nicht `/test/`).
- **Ereignis↔Tag (setzeTagesereignis):** Beim Speichern ersetzt der Eingabe-Screen ein am GENAU
  diesem Tag startendes Ereignis (`von === datum`) statt zu duplizieren; mehrtägige/überlappende
  Ereignisse (`von < datum`) bleiben unangetastet. Kategorien-Schema ist rückwärtskompatibel:
  `KATEGORIEN` (Validierung) = urlaub/feiertag_fest/krankheit/sport/wiesn/sonstiges (sport bleibt für
  Alt-Daten gültig), `EINGABE_KATEGORIEN` (UI-Auswahl) = ohne sport, mit sonstiges.
- **Bis zu 3 Zwischenziele:** `profil.zwischenziele` = Array (0–3) `[{typ,wert}]`, migriert altes
  einzelnes `profil.zwischenziel`. Alle vier Ziel-Editoren (Zielgewicht + ZZ1/2/3) identisches Layout:
  Überschrift-Zeile, darunter Typ-Segmented (BMI/kg) + −/+ Feld + abgeleiteter Wert. Zielgewicht ohne
  An/Aus, Zwischenziele mit. Defaults ZZ1=BMI30, ZZ2=27, ZZ3=24. Übersicht zeigt alle als Marker.
- **Ziel-Karte Feinschliff:** Titel nur „Weg zum Ziel" (kg-Ziel steht im Fuß). Zwischenziel-Label
  OBEN (blau / grün+✓ erreicht), weicht bei pos>72% nach links aus (keine Kollision mit %-Zahl).
  WHO-Striche neutral grau, BMI-Wert als Label UNTEN positionsgenau (grün+✓ wenn erreicht).
- **Ziel/Zwischenziel** (Profil): `profil.ziel` + optional `profil.zwischenziel`, je `{typ:'bmi'|'kg', wert}`
  (additiv). Default `{typ:'bmi',wert:25}`. Reine Funktionen `zielInKg`/`zielInBmi`/`DEFAULT_ZIEL` in
  calc.js (getestet). Profil-Bereich „Ziel": BMI/kg-Umschalter + −/+ Feld + abgeleitete Anzeige,
  auto-live. Übersicht-Ziel-Karte: dynamischer Titel, Fortschritt zum echten Ziel, Zwischenziel als
  prominenter blauer Marker mit Label, WHO-Schwellen (40/35/30) als dezente Striche (✓ wenn erreicht,
  Wert via title; überlappende WHO-Striche am eigenen Zwischenziel werden unterdrückt).
- **Anzeigegröße** (Spec: `docs/specs/2026-10-15-anzeigegroesse-darstellung-live-design.md`):
  `profil.anzeige_skala` (Prozent-Ganzzahl, Default 100). Stufen 90/100/110/120/130, reine Funktion
  `effektiveSkala` + `SKALA_STUFEN` in app/js/theme.js (getestet in tests/anzeige.test.js). Anwendung
  via `document.documentElement.style.zoom` in `skalaAnwenden()` (main.js) — bewusst `zoom` statt
  `rem`, da CSS feste px nutzt. Mockup: mockups/05-anzeigegroesse.html (Variante D, A-Größen).
  Hinweis: die zwei größten Stufen wurden später entfernt (Backlog Commit 1), Label → „Größe".
- Datenmodell additiv erweitert um optionales Top-Level `letztes_backup` (ISO), beim Export
  gesetzt; von baueExport NICHT mitexportiert (lokaler Marker), bricht pruefeImport nicht.
- **Verlauf-Sparkline X-Achse: bewusst index-basiert** (nicht zeitproportional). `sparklinePunkte`
  verteilt Punkte nach Index, nicht nach Datum — bei dicht erfassten Daten unauffällig, Lücken werden
  nicht als Abstand sichtbar. Vom Nutzer bewusst so belassen (2026-10-15); die zoombare Zeitachse
  gibt es auf dem Diagramme-Tab (uPlot). KEIN offener Bug.
- **Icon-Buttons immer Feather-SVG, nie Text-Glyphen:** `+`/`−`/`‹`/`›`/`▲▼`/`✓` als Text wirkten
  versetzt → app-weit auf SVG via `icon()` umgestellt (2026-10-16: Stepper, Chevrons, Trend-Pfeile,
  Ziel-Haken). Zentrierung von Icon-Buttons braucht Spezifität `#screen button.<klasse>` (siehe
  Spezifitätsfalle oben), sonst erbt die generische Regel padding → Icon rechtsbündig.
- **Swipe-Navigation** (seit 2026-11-16, Backlog Commit 6): Modul `app/js/swipe.js`. Reine,
  getestete Funktionen `nachbarScreen(aktuell, richtung)` (Kette `SWIPE_REIHENFOLGE =
  dashboard→eingabe→charts→verlauf→profil`, Ränder stoppen, kein Wrap) und `swipeRichtung(start, ende,
  schwellen?)` (Schwellen `SWIPE_SCHWELLEN`: >50px, |dx|≥2|dy|, <500ms, Einzelfinger). DOM-Verdrahtung
  `installiereSwipe(#screen, {aktuellerScreen, navigiere, aktiv})` — Bubble-Phase, `passive:true`, NIE
  `preventDefault` (vertikales Scrollen bleibt). **Profil ist in der Swipe-Kette** (letztes Glied),
  obwohl es NICHT in der Tab-Leiste steht — über das Profil-Icon weiter erreichbar. Navigiert über das
  bestehende `navigiere()`/`location.hash` (hartes Umschalten, keine Animation). Gate `aktiv()` =
  `!!profil` → kein Swipe im Onboarding. **Ausschlusszonen** `SWIPE_AUSSCHLUSS =
  [.u-over, .tage-pills, .jahr-leiste, .datum-picker]` (eine Stelle für alle horizontalen
  Interaktionszonen — bei neuen hier ergänzen): Start der Geste in einer Zone via `closest()` → Swipe
  verworfen, damit Chart-Scrubbing/Pill-Scroll/Datums-Rädchen nicht kollidieren. `main.js` nutzt eine
  gemeinsame `aktiverScreen()`-Hilfsfunktion für render() UND Swipe (gleiche Screen-Sicht). **Merke:**
  Der DOM-Teil ist bewusst NICHT unit-getestet (Projekt testet keinen DOM); echte Abnahme am Gerät —
  Playwright-Touch bildet Android nicht zuverlässig ab (vgl. Charts-Touch-Falle oben).
- Mockups liegen in `mockups/` (git-ignoriert, als HTML, vom Nutzer bewusst behalten — NIE löschen):
  01-dashboard, 02-spacing-kopf, 03-profil, 04-geschlecht-datum, 05-anzeigegroesse (+ -2/-4-optionen),
  06-uebersicht, 07-zeitfilter, 08-eingabe (A/B-Vergleich), 08-1-eingabe (Variante A verfeinert),
  10-ereignis-bearbeiten.
