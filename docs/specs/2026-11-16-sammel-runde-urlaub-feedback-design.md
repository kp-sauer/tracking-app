# Design-Spec: Urlaubs-Erkenntnisse & Nutzungs-Feedback (Sammel-Runde)

> **Status:** Entwurf, mit dem Nutzer durchgesprochen (2026-11-16). Sammelt die Anforderungen/Bugfixes
> aus Urlaubs- und Alltagsnutzung. Noch keine Umsetzung gestartet — diese Spec hält die abgestimmten
> Entscheidungen und die Umsetzungsreihenfolge fest.
>
> Zugehörige Arbeitsliste: [`../BACKLOG.md`](../BACKLOG.md) (Abschnitt „Sammel-Runde 2026-11-16").
> Arbeitsweise & Technik-Merkposten: [`../ENTWICKLER-NOTIZEN.md`](../ENTWICKLER-NOTIZEN.md).

## Überblick

Acht Punkte aus der realen Nutzung (u. a. eine Reise nach Palau, UTC+9). Zwei davon sind Bugs, der
Rest sind Feature-/Design-Verbesserungen. Die Nummerierung des Nutzers war eine lose Aufzählung pro
Bereich (keine Priorität außer „99 = niedrig“).

| Kürzel | Bereich | Thema | Art |
|---|---|---|---|
| **TZ** | global | Zeitzonen-Bug: „heute“ wird aus UTC statt lokal abgeleitet | 🐞 Bug |
| **C-Tage** | Charts | Tage-Filter um 30 & 60 ergänzen | ✨ klein |
| **C-Frei** | Charts | Neuer Filter „Frei“ (Von/Bis-Datumsauswahl) | ✨ neu |
| **C-Pick** | Charts | Wertepicker/Tooltip zeigt im Hochformat falsche Punkte; Ereignisse ins Popover | 🐞 Bug + ✨ |
| **V-Farbe** | Verlauf | Ereignis-Chips blau (Rand), Medikamenten-Chips grau | 🎨 CSS |
| **V-Jahr** | Verlauf | Jahr-Filter oben (schnelles Springen) | ✨ neu |
| **Ü-Min** | Übersicht | Minimum als grüner Punkt auf Linie + KPI-Kachel | ✨ |
| **P-Aequiv** | Profil | kg/BMI-Äquivalent immer unterhalb des Eingabewerts | 🎨 Layout |

---

## TZ — Zeitzonen-Bug (verifiziert)

**Symptom (Nutzer):** In Palau (UTC+9) wurde morgens um 7 Uhr auf Eingabe-, Übersichts- und
Verlauf-Screen noch der Vortag als „heute“ angezeigt; der aktuelle Tag galt als fehlend. Datum musste
manuell korrigiert werden.

**Root Cause (am 2026-11-16 deterministisch reproduziert):** Der heutige Kalendertag wird über
`new Date().toISOString().slice(0, 10)` abgeleitet. `toISOString()` liefert **UTC**. Östlich von UTC
(DE +1, Palau +9) ist das lokale Datum nach Mitternacht bzw. bis morgens bereits einen Tag weiter als
UTC → die App schlägt den Vortag vor.

Belegt mit System-TZ Europe/Berlin: Zeitpunkt lokal 28.10. 00:30 (= 27.10. 23:30 UTC) →
`toISOString()` ergibt `2026-10-27` (falsch), lokale Ableitung ergibt `2026-10-28` (richtig). In Palau
betrifft dasselbe Phänomen den ganzen Morgen statt nur die Minuten nach Mitternacht.

**Betroffene Stellen (verifiziert):**
- `app/js/screens/eingabe.js:8` — `heuteIso()` (Vorschlagsdatum, „Heute“-Pille, Zukunfts-Sperre)
- `app/js/screens/dashboard.js:68` — „Heute noch kein Wert erfasst“-Logik
- `app/js/screens/verlauf.js:42` — „heute“-Markierung (blauer Ring)
- `app/js/screens/profil.js:17` — Altersberechnung (Stichtag heute; harmlos, aber gleicher Bug)

**NICHT anfassen:** `datumPlusTage` (eingabe.js:11) und alle `Date.UTC(...)` in
`calc.js`/`schema.js`/`felder.js`/`verlauf.js`. Das ist reine Datums-Arithmetik auf bereits-ISO-Strings
(Tag±n, Wochentag, KW) und zeitzonen-unabhängig korrekt. Ein „Fix“ dort würde Logik brechen.

**Lösung (abgestimmt, Option 1 „lokales Datum“):** Zentraler Helper, kein Zeitstempel, keine
Datenmodell-Änderung:
```js
function heuteLokal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
```
Die 4 Aufrufstellen auf den Helper umstellen. Ablageort anhand der bestehenden Importe wählen
(Kandidat `felder.js` oder `calc.js`), damit kein Zyklus entsteht.

**Verworfen (Option 2):** Zusätzlicher Zeitstempel mit Zeitzone/UTC pro Eintrag. Begründung: trägt
nichts zur Fehlerbehebung bei, Nutzen heute nicht sichtbar, Altdaten hätten den Stempel ohnehin nicht.
Bleibt als spätere additive Idee möglich (siehe Backlog „Spätere Ideen“).

**Tests:** Reiner `heuteLokal`-Helper gegen fixe Zeitpunkte (Datumsgrenze), plus Regressionsnachweis,
dass die UTC-Arithmetik-Funktionen unverändert bleiben.

---

## C-Tage — Charts: Tage-Filter 30 & 60

Heute bietet die Tage-Pill-Zeile `90 · 180 · +Eigene` (`charts.js:53–56`). Ergänzen auf
`30 · 60 · 90 · 180 · +`. **Begriffs-Entscheidung (2026-11-16):** Die bisherige Pill „+ Eigene“ wird
zum neutralen **„+“**; das aufklappende Feld heißt **„Anzahl Tage“** (statt „Eigene Anzahl“). Rein
additive, lokale Änderung an `kontextHtml()` + Klick-Handler + Feld-Label.

## C-Frei — Charts: Filter „Zeitraum“ (Von/Bis)

Neues 4. Segment neben „Gesamt · Jahr · Tage“: **„Zeitraum“** (Begriffs-Entscheidung 2026-11-16 —
beschreibt das „Was“ besser als „Frei“ und vermeidet die Doppelung mit der B1-Pill). Blendet zwei
`datumsPicker` (Von/Bis) als Pillen ein.
- **Vorbelegung:** maximal möglicher Zeitraum = erster bis letzter Datenpunkt (also identisch zu
  „Gesamt“ als Ausgangswert).
- **Grenzen:** Von darf nicht vor dem ersten, Bis nicht nach dem letzten Datenpunkt liegen; Von ≤ Bis.
- Nutzt den bekannten Rädchen-`datumsPicker` aus `felder.js`.
- **Layout (Variante A, abgestimmt):** „Zeitraum“ ist ein gleichwertiges 4. Segment. Schrift bleibt
  14px (nicht verkleinern). Mockup: `mockups/11-charts-filterleiste.html`.

**Abhängigkeit:** Ein 4. Segment verbreitert die Segmented-Control → genau der Umbruch-Fall, den
Commit 7 (dynamisch grau/blau) löst. Deshalb mit C-Tage und Commit 7 **in einer Phase** umsetzen
(einmal an der Filterleiste arbeiten).

## C-Pick — Charts: Touch-Cursor-Bug (Position + Ziehen)

**Symptom:** Außerhalb des Vollbilds markiert der Cursor bei Touch Punkte abseits der Berührung; zudem
folgt die Auswahl beim Ziehen mit dem Finger NICHT (man muss jedes Mal neu tippen).

**Root Cause (2026-11-16 verifiziert, inkl. uPlot-Quellcode-Analyse):** uPlot v1.6.31 (unser Vendor-
Build) bindet **nur Maus-Events** (`mousedown/mousemove/mouseup/dblclick`), **keine** Touch-Events.
Auf Touch-Geräten liefert der Browser synthetische Maus-Events — aber (a) mit einem veralteten/falschen
gecachten Zeichenflächen-Rect (`getBoundingClientRect` wird in uPlot nur bei scroll/resize invalidiert)
→ konstanter X-Offset ≈ Breite der Y-Achse + Padding; und (b) nur beim Absetzen, nicht kontinuierlich
→ kein Scrubbing. Mit der Maus fiel der Offset kaum auf. Im Browser mit Touch-Emulation reproduziert
(Offset ~56px; Cursor bewegt sich beim Ziehen gar nicht). Ein erster Versuch mit `plot.syncRect()`
griff NICHT (uPlot holt das Rect danach nicht erneut) → verworfen.

**Lösung (final, nach 2 gescheiterten Fix-Versuchen am echten Gerät): „Tap → Vollbild"-Workaround.**
Der eigene Touch-Handler (Rect-frisch + Zoom-Faktor-Korrektur) sah in der Playwright-Touch-Emulation
jeweils korrekt aus, lag aber auf dem echten Android weiter daneben (die Emulation bildet das reale
Touch-/Zoom-Verhalten nicht ab). Deshalb den Touch-Handler ganz entfernt und stattdessen: In der
Normalansicht öffnet ein **sauberer Tap** (kurz, kaum Bewegung — vertikales Scrollen/Halten löst NICHT
aus) auf die Chart-Fläche den **Vollbild-Modus**, wo Cursor/Tooltip und Scrubbing nachweislich korrekt
sind (vom Nutzer bestätigt). Zurück aus dem Vollbild wie bisher über das X-/Vollbild-Icon. Kein Tooltip
mehr in der Normalansicht — bewusst, da dort fummelig und fehlerhaft.

Ereignis-im-Popover (ursprünglicher Zusatzwunsch): weiterhin zurückgestellt.

Lehre (Merkposten): uPlot v1.6.31 hat keinen Touch-Support; Touch-Cursor-Fixes lassen sich in der
Browser-Emulation NICHT verlässlich verifizieren — nur am echten Gerät. Daher Workaround statt Kampf
mit Vendor-Interna.

---

## V-Farbe — Verlauf: Chip-Farben

- **Ereignis-Chips:** blau mit **Rand** (blaue Schrift/Rand auf hellem Grund, NICHT voll gefüllt).
  Signalisiert dezent „klickbar“ (Ereignis-Chips öffnen das Bearbeiten-Overlay), ohne wie ein aktiver
  Button zu wirken.
- **Medikamenten-Chips:** grau (= „nur Info“, aktuell nicht klickbar).

**Begründung / Konflikt gelöst:** Ursprungswunsch war „grün“, aber grün = „Abnahme/gut“ im Design-
System → Verwechslungsgefahr mit grünen Abnahme-Werten im selben Eintrag. Blau/grau trennt sauber und
ist sogar semantisch konsistenter (blau = klickbar, grau = Info).

**Spätere Wechselwirkung:** Commit 5 macht Medikamenten-Chips klickbar → dann dort prüfen, ob die
Medikament-Chips doch ein Klick-Signal brauchen. V-Farbe zuerst ist unkritisch.

## V-Jahr — Verlauf: Jahr-Filter oben

Horizontale Leiste oben im Verlauf: `Alle · 2026 · 2025 · 2024 …` (Jahre **absteigend**, neueste zuerst;
horizontal scrollbar bei vielen Jahren). Tipp auf ein Jahr filtert die Monatsgruppen auf dieses Jahr;
danach kurz zum Monat scrollen. Default = „Alle“ (= heutiger Zustand). Aktives Jahr im Pill-Stil der
Charts-Tage-Pills (blau mit Rand). Zweck: schnelles Springen zu einem Zeitpunkt (z. B. Nov 2025)
ohne langes Scrollen. Konsistent mit dem Zeitfilter in Übersicht/Charts.
Mockup: `mockups/15-verlauf-jahrfilter.html`. Technik: `datenJahre` wird nach db.js zentralisiert
(war doppelt in dashboard.js + charts.js) und von allen dreien genutzt.

---

## Ü-Min — Übersicht: Minimum als Punkt

Aktuell-Minimum-Gewicht als auffälliger Punkt **auf dem „Weg zum Ziel"-Balken** (NICHT auf der
Sparkline — Korrektur 2026-11-16) an der Minimum-Position (via bestehender `markerPos()`-Logik), und
denselben Punkt als Marker **neben dem Label der Min-KPI-Kachel** (spart Text/Label).

**Design-Entscheidungen (2026-11-16):**
- **Gefüllter** grüner Punkt (mit dünnem Rand in Surface-Farbe, damit er sich von der blauen
  Balken-Füllung abhebt). Kein „Ring".
- **Kein Text-Label am Balken** — würde mit den BMI-/Zwischenziel-Labels kollidieren. Die Verbindung
  stellt der identische grüne Punkt an der „Minimum"-KPI-Kachel darüber her.
- **Farbe grün** (nicht rot): Minimum = niedrigstes Gewicht = gut; konsistent mit Chart (`--gut`).

## P-Aequiv — Profil: kg/BMI-Äquivalent unterhalb

In den Ziel-Editoren (Zielgewicht + Zwischenziele) steht der abgeleitete Äquivalenzwert (kg bzw. BMI)
je nach Eingabe mal ein-, mal zweizeilig → wirkt unruhig. Lösung: den Äquivalenzwert **immer** in einer
eigenen Zeile **unterhalb** des Eingabefelds anzeigen (konsistentes Layout, kein Umbruch-Zufall).

**Verwandtschaft:** betrifft dasselbe ein-/zweizeilige Verhalten im Profil wie Commit 7. Gut zusammen
mit den kleinen visuellen Fixes umzusetzen.

## P-Geschlecht — Profil: Geschlecht-Chips M/W/D bei wenig Platz (2026-11-16)

Die Geschlecht-Segmented-Control (`geschlechtSegment` in felder.js) zeigt „Männlich/Weiblich/Divers“.
Bei wenig Platz auf **M / W / D mit Icon** kürzen (dynamisch per ResizeObserver, wie die Charts-Leiste
in Phase B):
- M = ♂-Symbol (Feather-Stil: Kreis + diagonaler Pfeil), W = ♀-Symbol (Kreis + Kreuz unten),
  D = **⚥** (U+26A5, androgyn) + Buchstabe „D“.
- Ausgeschrieben, solange einzeilig Platz ist; sonst gekürzt.

---

## Umsetzungsreihenfolge (abgestimmt)

Prinzip: Bugs zuerst (Datenkorrektheit), dann alles bündeln, was dieselbe UI-Fläche anfasst, dann
schnelle visuelle Wins, dann Komfort/niedrige Prio.

- **Phase A — Bug zuerst:** TZ (Zeitzonen-Fix).
- **Phase B — Charts-Filterleiste am Stück:** C-Tage + C-Frei + **Backlog Commit 7** (dynamisch
  grau/blau) — alle fassen dieselbe Leiste an.
- **Phase C — kleine visuelle Fixes:** V-Farbe + Ü-Min + P-Aequiv.
- **Phase D — Verlauf-Navigation:** V-Jahr.
- **Phase E — restlicher Backlog (niedrige Prio):** Commit 5 (Medikament bearbeiten),
  Commit 6 (Swipe-Navigation), Commit 8 (In-App-Splash).
- **Phase F — ganz ans Ende (niedrige Prio):** C-Pick (Charts-Tooltip-Bug + Ereignisse im Popover).

Jede Phase: Mockup wo visuell sinnvoll → Umsetzung (TDD wo testbar, subagent-getrieben) → Browser-Check
über `localhost:8000/test/`. Push durch den Nutzer via GitHub Desktop.
