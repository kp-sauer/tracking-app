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

## Commit 5 — Verlauf Medikamenten-Bearbeitung (Prio 99, später)

- [ ] **[VERLAUF]** Medikamenten-Chips per Doppelklick bearbeitbar machen (Popup analog Ereignis-Bearbeiten)

---

## Commit 6 — Swipe-Navigation (Prio 99, später)

- [ ] **[USABILITY]** Wischen zwischen den 4 Screens (Übersicht ↔ Eingabe ↔ Charts ↔ Verlauf) via touchstart/touchend

---

## Commit 7 — Chips/Seg dynamisch (Prio 99, später)

- [ ] **[ÜBERALL]** `.seg-kompakt` per ResizeObserver automatisch setzen: wenn alle Buttons in einer Zeile passen → grauer Hintergrund-Container (`.seg-kompakt`), sonst blaue Umrandung (`.seg`). Ändert sich dynamisch bei Gerätedrehung. Aktuell statisch per Klasse gelöst (Session 2026-10-19).

---

## Commit 8 — In-App-Splash-Screen (Prio 99, später)

- [ ] **[UX]** Eigener In-App-Splash beim Start (ersetzt den langweiligen nativen PWA-Splash): Logo mit abgerundeten Ecken, Fade-in/out-Animation, modern. Design noch offen (Mockup-Runde ausstehend).

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

## Phase D — Verlauf-Navigation

- [ ] **[VERLAUF]** Jahr-Filter oben: `Alle · 2024 · 2025 · … ` (horizontal scrollbar), filtert
  Monatsgruppen aufs Jahr; Default „Alle“. Zweck: schnelles Springen zu einem Zeitpunkt.

## Phase E — restlicher Backlog (Prio 99)

- [ ] **(= Commit 5)** [VERLAUF] Medikamenten-Chips per Doppelklick bearbeitbar (Popup analog Ereignis).
  Beim Umsetzen: Wechselwirkung mit V-Farbe prüfen (grauer Chip wird dann klickbar).
- [ ] **(= Commit 6)** [USABILITY] Swipe-Navigation zwischen den 4 Screens.
- [ ] **(= Commit 8)** [UX] In-App-Splash-Screen (Mockup-Runde ausstehend).

## Phase F — ganz ans Ende (Prio 99)

- [ ] **[CHARTS]** Wertepicker/Tooltip zeigt im **Hochformat** falsche/zufällige Punkte (nur Vollbild
  korrekt); soll nur Gewichtswerten folgen. **Erst im Browser reproduzieren** (Verdacht: Plot-Größe vor
  finalem Layout gezeichnet, rAF-Nachmessung nur im Vollbild), dann fixen. Zusatz: stattgefundene
  **Ereignisse im Popover** anzeigen.

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
