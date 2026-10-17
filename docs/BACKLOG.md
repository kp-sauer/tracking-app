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

## Commit 2 — CSS-Redesign Chips & Buttons (Prio 1 + 2)

- [ ] **[ÜBERALL]** Chip/Pill-Auswahl-Elemente: graue Hintergrundumrandung entfernen, stattdessen dünner blauer Rand (betrifft: Ereignis-Kategorie, Profil Geschlecht/Anzeigegröße/Design, Popup-Ereignis, ggf. weitere)
- [ ] **[ÜBERALL]** Speichern-Buttons hellblau einfärben (heben sich aktuell zu wenig vom Content ab)
- [ ] **[ÜBERALL]** Kopf-/Titelzeile: etwas kompakter (weniger Padding oben/unten)

---

## Commit 3 — Eingabe-Layout (Prio 1 + 2)

- [ ] **[EINGABE]** Datumsauswahl immer zweizeilig: Zeile 1 = Datum-Text + optional "Heute"-Chip, Zeile 2 = ‹ Datum › Chevrons
- [ ] **[EINGABE]** Speichern-Button zwischen Gewichtseingabe und Ereignis/Medikament verschieben (schnelle Eingabe ohne Scrollen)

---

## Commit 4 — Dashboard-Logik (Prio 2)

- [ ] **[ÜBERSICHT]** Hinweis "Heute noch kein Wert erfasst" — subtil, unterhalb Hero-Zahl, oberhalb der Filter-Chips
- [ ] **[ÜBERSICHT]** Trend-Icon: Amber/Orange-Zone einführen: 0 bis +1 kg = orange, über +1 kg = rot (statt alles rot)

---

## Commit 5 — Verlauf Medikamenten-Bearbeitung (Prio 99, später)

- [ ] **[VERLAUF]** Medikamenten-Chips per Doppelklick bearbeitbar machen (Popup analog Ereignis-Bearbeiten)

---

## Commit 6 — Swipe-Navigation (Prio 99, später)

- [ ] **[USABILITY]** Wischen zwischen den 4 Screens (Übersicht ↔ Eingabe ↔ Charts ↔ Verlauf) via touchstart/touchend
