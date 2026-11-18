# Backlog — UX/Design Nachbesserungen

Priorisierte Liste nach Session 2026-10-17. Abarbeitung in Commit-Paketen.

---

## Commit 1 — Micro-Fixes (Prio 1 + gebündelte Trivialitäten) ✅

- [x] **[PROFIL]** Toaster-Message bei Speichern von Stammdaten und Zwischenziel
- [x] **[PROFIL]** Anzeigegröße: die zwei größten Optionen entfernen (zu groß auf Mobilgeräten)
- [x] **[PROFIL]** Anzeigegröße: Label umbenennen → "Größe" (passt dann in eine Zeile)
- [x] **[PROFIL]** Umgebungsanzeige: "Produktiv" → "PROD"
- [x] **[EINGABE]** Label "Ereignis hinzufügen" → "Ereignis", "Medikament hinzufügen" → "Medikament"
- [x] **[VERLAUF]** Monatsnamen im Ereignis-Bearbeiten-Popup kürzen: Jan, Feb, Mär, Apr, Mai, Jun, Jul, Aug, Sep, Okt, Nov, Dez
- [x] **[USABILITY]** iPhone: `touch-action: manipulation` auf alle +/- Stepper-Buttons (verhindert ungewollten Zoom bei schnellem Tippen)

---

## Commit 2 — CSS-Redesign Chips & Buttons (Prio 1 + 2) ✅

- [x] **[ÜBERALL]** Chip/Pill-Auswahl-Elemente: graue Hintergrundumrandung entfernen, stattdessen dünner blauer Rand (betrifft: Ereignis-Kategorie, Profil Geschlecht/Anzeigegröße/Design, Popup-Ereignis, ggf. weitere)
- [x] **[ÜBERALL]** Speichern-Buttons hellblau einfärben (heben sich aktuell zu wenig vom Content ab)
- [x] **[ÜBERALL]** Kopf-/Titelzeile: etwas kompakter (weniger Padding oben/unten)

---

## Commit 3 — Eingabe-Layout (Prio 1 + 2) ✅

- [x] **[EINGABE]** Datumsauswahl immer zweizeilig: Zeile 1 = Datum-Text + optional "Heute"-Chip, Zeile 2 = ‹ Datum › Chevrons
- [x] **[EINGABE]** Speichern-Button zwischen Gewichtseingabe und Ereignis/Medikament verschieben (schnelle Eingabe ohne Scrollen)

---

## Commit 4 — Dashboard-Logik (Prio 2) ✅

- [x] **[ÜBERSICHT]** Hinweis "Heute noch kein Wert erfasst" — subtil, unterhalb Hero-Zahl, oberhalb der Filter-Chips
- [x] **[ÜBERSICHT]** Trend-Icon: Amber/Orange-Zone einführen: 0 bis +1 kg = orange, über +1 kg = rot (statt alles rot)

---

## Commit 5 — Verlauf Medikamenten-Bearbeitung (✅ erledigt 2026-11-16, siehe Phase E unten)

- [x] **[VERLAUF]** Medikamenten-Chips bearbeitbar machen (Popup analog Ereignis-Bearbeiten)

---

## Commit 6 — Swipe-Navigation (✅ erledigt 2026-11-16, siehe Phase E unten)

- [x] **[USABILITY]** Wischen zwischen den 4 Screens (Übersicht ↔ Eingabe ↔ Charts ↔ Verlauf) via touchstart/touchend

---

## Commit 7 — Chips/Seg dynamisch (Prio 99, später)

- [ ] **[ÜBERALL]** `.seg-kompakt` per ResizeObserver automatisch setzen: wenn alle Buttons in einer Zeile passen → grauer Hintergrund-Container (`.seg-kompakt`), sonst blaue Umrandung (`.seg`). Ändert sich dynamisch bei Gerätedrehung. Aktuell statisch per Klasse gelöst (Session 2026-10-19).

---

## Commit 8 — In-App-Splash-Screen (Prio 99, später)

- [ ] **[UX]** Eigener In-App-Splash beim Start (ersetzt den langweiligen nativen PWA-Splash): Logo mit abgerundeten Ecken, Fade-in/out-Animation, modern. Design noch offen (Mockup-Runde ausstehend).

---
---

# Arbeitspaket: Zwei-Geräte-Pflege via Dropbox-Backup ✅ (2026-11-18, umgesetzt v73, am Gerät abgenommen)

> **Session-Übergabe:** UMGESETZT, browser- UND gerät-verifiziert (2026-11-18, v73). Spec:
> [`specs/2026-11-18-zwei-geraete-dropbox-merge-design.md`](specs/2026-11-18-zwei-geraete-dropbox-merge-design.md),
> Plan: [`../plans/2026-11-18-zwei-geraete-dropbox-merge-plan.md`](../plans/2026-11-18-zwei-geraete-dropbox-merge-plan.md).
> **Geräte-Abnahme ✅:** echter Flow Android → Export → Dropbox → iPhone → Import → Zusammenführen →
> Konflikt-Dialog → Ergebnis → zurück lief fehlerfrei (Nutzer, 2026-11-18). Offen bleibt nur die
> **Alltags-Kurzanleitung** (optional, s. u.).
>
> **Was wird übertragen? (geklärt 2026-11-18):** Die Export-Datei (`baueExport`) enthält `profil`,
> `tageseintraege` (Gewicht+Spritze+historie_rohtext) UND `ereignisse`. Beim **Merge** (`wendeMergeAn`)
> gilt aber: Tageseinträge werden vereinigt (Konflikt → Rückfrage), Ereignisse still per `id` vereinigt,
> **Profil aber LOKAL-FIRST** — das Profil des Zielgeräts bleibt; das Datei-Profil wird nur übernommen,
> wenn lokal GAR KEINS existiert. Also: Gewichtstage + Ereignisse wandern mit, das Profil (Größe/Geschlecht/
> Geburtsdatum/Theme/Größe/Ziele) bleibt pro Gerät. NICHT in der Datei: `letztes_backup` (lokaler Marker),
> Undo-Historie (Session), Berechnetes (BMI/KPIs). Falls gewünscht, dass Profil mitwandert → bewusste
> Zusatzänderung (aktuell absichtlich getrennt; Nutzer hat lokal-first am 2026-11-18 bestätigt).

## Ausgangswunsch (Nutzer)
Daten auf ZWEI Geräten pflegen: **~90 % Android** (Hauptgerät), gelegentlich auf Geschäftsreisen
**iPhone** (Geschäftstelefon). Ursprüngliche Idee war „Backup/Restore über zentrales Git".

## Entscheidungen (2026-11-18, durch Brainstorming geklärt)
- **Git als Transport VERWORFEN.** Gründe: PWA kann nicht nativ pushen (bräuchte GitHub-REST-API +
  Schreib-**Token im Browser**, auch auf dem iPhone → Compliance-/Sicherheitsproblem); GitHub Pages
  ist nur-lesend (statisches CDN); Git nimmt den FACHLICHEN Merge (pro Tag) nicht ab — den macht die
  App ohnehin selbst (`wendeImportAn`). Viel Komplexität ohne Mehrwert.
- **Nutzer-Vorgaben (verbindlich):** (a) „Egal wie, Hauptsache reibungslos" — Transportweg ist frei
  wählbar; (b) **kein Token/Secret auf dem iPhone** → damit scheiden GitHub-API, Gist & alle
  tokenbasierten Dienste aus; (c) **Dropbox-App liegt bereits auf BEIDEN Geräten**; (d) **denselben
  Tag auf beiden Geräten ändern = SELTEN** → kein Datenmodell-Umbau, kein `erfasst_am`-Zeitstempel.
- **Gewählte Lösung:** **Geteilter Dropbox-Ordner + „Merge-first".** Transport = bestehender
  JSON-Export/-Import über die native Teilen-/Datei-Öffnen-Funktion; die Dropbox-App synct die Datei
  zwischen den Geräten. **Kein neuer Sync-Code, kein Secret in der App.** Weicht die alte
  Architektur-Entscheidung „ein Hauptgerät, kein Sync" (README) bewusst auf → dateibasierter
  Pseudo-Sync, manuell ausgelöst.

## Ist-Zustand Code (gesichtet, `app/js/backup.js`)
- `baueExport` / `pruefeImport` (Welt-Prüfung hart) / `wendeImportAn(bestand, datei, modus)`.
- `wendeImportAn` kann bereits `'ersetzen'` UND `'merge'`. **Merge-Semantik aktuell:**
  Tage = `{...bestand, ...datei}`, Ereignisse per `id` → **bei Kollision gewinnt die DATEI.**
  ⚠️ Das ist die kritische Stelle: importiert man einen ÄLTEREN Stand, überschreibt er bei einem
  am selben Tag abweichenden Wert den (neueren) lokalen — zu klären (s. u.).

## Umgesetzt (v73, 2026-11-18)
- [x] **Reine Logik in `backup.js`:** `analysiereImport(bestand,datei)→{neu,identisch,konflikte}`
  (tiefer Tageseintrag-Vergleich via `JSON.stringify`: Gewicht/Spritze/historie_rohtext) +
  `wendeMergeAn(bestand,datei,wahl)` mit `wahl: 'datei'|'lokal'` → `{bestand, zaehlung}` mit
  `zaehlung={neu,aktualisiert,unveraendert}`. Merge löscht nie lokale Tage; Ereignisse per `id`,
  Profil lokal-first. `wendeImportAn(…,'ersetzen'|'merge')` unverändert. **14 neue Tests** (6+8),
  gesamt 208/208 grün (`node --test "tests/*.test.js"`).
- [x] **UI in `screens/profil.js`:** natives `confirm()` ENTFERNT → 3 Overlays: Import-Modus
  (Merge primär/blau, Ersetzen gefahr/orange mit Warnung, Abbrechen), Konflikt-Sammel-Dialog
  (Liste `Datum: lokal x → Datei y`, „Alle aus Datei" / „Alle lokal behalten"), Ergebnis-Dialog
  (bleibt stehen). CSS-Regeln `#screen .dialog.pr-import …` (Spezifitätsfalle umgangen).
- [x] **Re-Render-Fix (wichtig):** Ergebnis-Dialog verschwand zunächst, weil `store.aktualisiere`
  einen `render()`-Re-Render auslöst, der `#screen` neu baut. Gelöst über Modul-Variable
  `offenesImportErgebnis` in profil.js (überlebt Re-Render, wird beim Screen-Aufbau angezeigt +
  zurückgesetzt) — selbes Muster wie die Erfolgs-Pille. **Löst damit auch** den vertagten
  ENTWICKLER-NOTIZEN-Punkt „Import-Erfolgsmeldung verschwindet durch Re-Render".
- [x] **Browser-Check** `localhost:8000/test/` (echte Daten, Cache per CDP umgangen): Modus-/Konflikt-/
  Ergebnis-Dialog, Merge + Ersetzen, erzwungene Kollision, Re-Import (0 Konflikte), Button-Farben
  **hell UND dunkel** (`#2563eb`/`#d97706` bzw. `#4f93f5`/`#fbbf24`) — alle ✅.
- [ ] **Alltags-Kurzanleitung** Hin-und-Her (Export→Dropbox→Import/Merge→zurück) — OPTIONAL, noch offen.
  Ggf. kurzer App-Hinweis im Backup-Bereich.
- **Deckt vertagte ENTWICKLER-NOTIZEN-Punkte mit ab:** „Import-Erfolgsmeldung verschwindet durch
  Re-Render" (durch Ergebnis-Dialog gelöst). „Backup-Bereich feintunen" teilweise (Import-UI neu).

## Hinweis (Session 2026-11-18)
Beim Verifizieren wurde die **Test-Welt-IndexedDB** versehentlich per „Ersetzen"-Test überschrieben und
anschließend vom Nutzer aus `seed_test_2026-10-16_1535.json` (746 Tage) wiederhergestellt. Excel + Produktiv
unberührt. **Merke:** vor destruktiven Browser-Tests immer erst den Bestand exportieren.

---
---

# Sammel-Runde 2026-11-16 (Urlaubs-Erkenntnisse & Nutzungs-Feedback)

> Acht Punkte aus realer Nutzung (u. a. Reise nach Palau, UTC+9). Vollständige Begründungen,
> Entscheidungen und verifizierter Bug-Befund in
> [`specs/2026-11-16-sammel-runde-urlaub-feedback-design.md`](specs/2026-11-16-sammel-runde-urlaub-feedback-design.md).
> Reihenfolge in Phasen; die bestehenden Commits 5–8 sind in die Phasen eingeordnet.

## Phase A — Bug zuerst ✅

- [x] **[TZ / global]** Zeitzonen-Bug: „heute“ wurde aus UTC (`toISOString`) statt lokal abgeleitet → in
  Palau (UTC+9) morgens Vortag vorgeschlagen. **ERLEDIGT (2026-11-16):** zentraler Helper `heuteLokal()`
  in calc.js (lokale Datums-Komponenten), alle **6** Aufrufstellen umgestellt (eingabe.js, dashboard.js,
  verlauf.js ×2, profil.js ×2 inkl. Backup-Dateiname). `Date.UTC`-Arithmetik unangetastet. 3 neue Tests.
  Im Browser mit emulierter Palau-Zeitzone verifiziert.

## Phase B — Charts-Filterleiste am Stück ✅

- [x] **[CHARTS]** Tage-Filter um **30 & 60** ergänzt → `30 · 60 · 90 · 180 · +`. „Eigene Anzahl“ → **„Anzahl Tage“**.
- [x] **[CHARTS]** Neuer Filter **„Zeitraum“** (4. Segment; Begriff statt „Frei“): Von/Bis via `datumsPicker`,
  vorbelegt mit max. Zeitraum (erster–letzter Datenpunkt), Grenzen = Datenrand, Von ≤ Bis. Reine Funktion
  `imZeitfenster(…, modus:'zeitraum')` getestet. **Feinschliff:** Klick auf Von ODER Bis öffnet/schließt
  BEIDE Picker gemeinsam (ein Tap statt zwei).
- [x] **[ÜBERALL] (= bisheriger Commit 7)** `.seg-kompakt` dynamisch per ResizeObserver: einzeilig →
  grauer Container, bei Umbruch → blaue Umrandung. Im Browser auf schmal (375px) + breit verifiziert.
  (Geschlecht-Chips M/W/D: NICHT Teil von Phase B — siehe Phase C / Profil.)

## Phase C — kleine visuelle Fixes ✅

- [x] **[VERLAUF]** Chip-Farben: **Ereignis blau (Rand, nicht gefüllt)**, **Medikament grau**
  (Hintergrund `--rand`, nach Gerätetest einen Tick dunkler als `--surface-2`, sonst kaum sichtbar).
  (Ursprungswunsch „grün“ verworfen — grün = Abnahme/gut, Verwechslungsgefahr.)
- [x] **[ÜBERSICHT]** Aktuelles **Minimum als grüner Punkt** — NICHT auf der Sparkline, sondern auf dem
  **„Weg zum Ziel“-Balken** (via `markerPos`, ohne Text-Label) + gleich großer grüner Punkt neben dem
  Label der Min-KPI-Kachel (11px, identisch zum Balken-Marker). Grün = „niedrig = gut“.
- [x] **[PROFIL]** kg/BMI-Äquivalent in den Ziel-Editoren **immer unterhalb** des Eingabefelds (eigene
  Zeile, rechtsbündig, `flex-basis:100%`) — in allen 4 Ziel-Editoren.
- [x] **[PROFIL]** Geschlecht-Chips: Zeile auf **volle Breite** umgebaut (Label oben, Chips darüber die
  ganze Kartenbreite, Muster wie `zeile-datum`) → „Männlich/Weiblich/Divers“ passt auf gängigen Handys.
  **Geschlecht-Icons IMMER** vor dem Label (♂ / ♀ / ⚥ U+26A5 für Divers). Dynamische Kurzform (M/W/D)
  greift per ResizeObserver nur noch als Fallback bei sehr schmalen Displays (~320px).

## Phase D — Verlauf-Navigation ✅

- [x] **[VERLAUF]** Jahr-Filter oben: `Alle · 2026 · 2025 · … ` (Jahre absteigend, horizontal scrollbar),
  filtert Monatsgruppen aufs Jahr; Default „Alle“. Pill-Stil wie Charts-Tage-Pills. `renderVerlauf` auf
  `baue()`-Re-Render umgestellt (Dialoge/Chips/Edit/Undo überleben den Re-Render). `vortagesDifferenzen`
  weiter auf GESAMTdaten, nur die Anzeige wird gefiltert. **Zusätzlich:** `datenJahre` nach db.js
  zentralisiert (war doppelt in dashboard.js + charts.js), von allen dreien importiert, getestet.

## Phase E — restlicher Backlog (Prio 99)

- [x] **(= Commit 5)** [VERLAUF] Medikamenten-Chips bearbeitbar (Popup analog Ereignis). **ERLEDIGT
  (2026-11-16):** strukturierte Med-Chips (mit dosis_mg) per Klick → Overlay Bearbeiten (Präparat/
  Dosis/Pen) + Löschen (rote Bestätigung), undobar. Rohtext-Altdaten („OZ 10/2") NICHT bearbeitbar.
  Neues Modul `app/js/spritze.js` (reine Fn + Tests); `DOSIS_LISTE` nach schema.js zentralisiert;
  klickbarer Chip = grauer Rand (Rand=klickbar: Ereignis blau / Medikament grau / Rohtext randlos).
  Browser-verifiziert. Spec: `specs/2026-11-16-medikament-bearbeiten-design.md`.
- [x] **(= Commit 6)** [USABILITY] Swipe-Navigation zwischen den 4 Screens. **ERLEDIGT (2026-11-16):**
  Kette `Übersicht → Eingabe → Charts → Verlauf → Profil` (Profil zusätzlich in der Swipe-Kette,
  bleibt über das Icon erreichbar), beide Richtungen, Ränder stoppen (kein Wrap), hartes Umschalten.
  Neues Modul `app/js/swipe.js` (reine `swipeRichtung`/`nachbarScreen` + DOM-Verdrahtung
  `installiereSwipe`); Ausschlusszonen `.u-over/.tage-pills/.jahr-leiste/.datum-picker`; Onboarding
  ausgenommen. 16 Tests, Browser-verifiziert. **Am Gerät durch Nutzer abgenommen (2026-11-18).** Spec:
  `specs/2026-11-16-swipe-navigation-design.md`.
- [ ] **(= Commit 8)** [UX] In-App-Splash-Screen (Mockup-Runde ausstehend).

## Phase F — Charts Touch-Cursor ✅

- [x] **[CHARTS]** Touch-Cursor/Tooltip lag auf dem Gerät daneben (positionsabhängiger Versatz) und
  Ziehen funktionierte nicht. **Root Cause:** uPlot v1.6.31 bindet keine Touch-Events; zusätzlich
  verfälscht der UI-`zoom` (Anzeigegröße) die Koordinaten. Zwei direkte Fix-Versuche am eigenen
  Touch-Handler scheiterten am echten Android (Emulation ≠ Gerät). **Lösung (umgesetzt & am Gerät
  bestätigt):** Normalansicht = sauberer **Tap → Vollbild** (Scroll/Halten löst nicht aus); im
  **Vollbild** ein eigener Touch-Handler (`plot.setCursor`, Zoom-korrigiert) → Antippen UND Ziehen
  folgen dem Finger. „Ereignisse im Popover" bewusst zurückgestellt.
- [x] **[PWA, Bugfix nebenbei]** Seit der Versions-Zentralisierung (v63) änderte sich `sw.js` bei
  Versionswechseln nicht mehr byteweise → der Browser installierte KEINEN neuen Service Worker →
  Updates kamen am Gerät nie an (v63–v69 klebten fest). **Fix:** literale `BUILD`-Zeile in `sw.js`, die
  beim Deploy mit `version.js` hochgezählt wird (+ Selbstkontroll-Warnung bei Abweichung). **Neue
  Deploy-Routine: BEIDE hochzählen — `app/js/version.js` UND `BUILD` in `app/sw.js`.**

---

## Zusätzlich umgesetzt (außerhalb der Phasen)

- [x] **[PROFIL] Versionsanzeige** (2026-11-16, Nutzer-Wunsch): dezente Fußzeile **„WeightLog v<nr>“**
  unten im Profil (beide Welten, `--fg-3`). Quelle = zentrale `app/js/version.js` (`globalThis.APP_VERSION`,
  **kein** `export` → per `importScripts` auch vom klassischen SW lesbar). sw.js leitet den Cache-Namen
  daraus ab (`'tracking-shell-v' + APP_VERSION`). **Folge für den Workflow:** Version künftig NUR in
  `version.js` hochzählen — UI-Fußzeile UND SW-Cache ziehen automatisch nach (nicht mehr sw.js editieren).

---

## Spätere Ideen (nicht eingeplant)

- **Zeitstempel mit Zeitzone pro Eintrag** (Option 2 aus der TZ-Diskussion): additives `erfasst_am` mit
  UTC/Offset als Metadaten. Verworfen für jetzt (kein sichtbarer Nutzen, Altdaten ohne Stempel). Bei
  Bedarf später additiv nachrüstbar.
