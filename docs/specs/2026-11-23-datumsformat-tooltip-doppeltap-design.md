# Design: Datumsformat-Setting, Chart-Tooltip mit Ereignissen/Medikamenten, Doppeltap zur Charts

> Status: **Design abgenommen** (2026-11-23). Drei Themen aus realer Nutzung, in einem Spec gebündelt,
> weil sie sich sinnvoll gemeinsam umsetzen lassen (Thema 2 profitiert vom neuen Datums-Helper aus
> Thema 1). Mockup: `mockups/18-chart-tooltip-ereignisse.html`.

## Ausgangslage (Nutzer-Feedback)

1. **Chart-X-Achse zeigt amerikanisches Format** (`10/31`) — uPlot-Default (MM/DD), für deutsche Nutzung
   falsch. Wunsch: Datumsformat app-weit über ein **Profil-Setting (Darstellung)** einstellbar,
   getrennt für **lange** (Geburtsdatum, Date-Picker) und **kurze** Daten (Chart-Achse).
2. **Chart-Wertepicker (Tooltip)** soll zusätzlich zu Datum + Serienwerten die **Ereignisse und
   Medikamente** des Tages zeigen (z. B. „Urlaub", „Wiesn", „MJ 12,5"), als Chips in Verlauf-Farbgebung.
3. **Übersicht:** Doppeltap/-klick auf den Mini-Verlaufschart → Wechsel zum Charts-Screen.

---

## Thema 1 — Datumsformat als Profil-Setting

### Entscheidung
Zwei getrennte Einstellungen in **Profil → Darstellung** (neben Design und Größe), je als Preset-Auswahl
(kein Freitext):

- **Langes Datum** (Geburtsdatum-Anzeige, Date-Picker-Kopf, Verlauf-Monatsgruppen, Backup-Anzeige):
  - `31. Okt. 2026` (Monatswort) — **Default**
  - `31.10.2026` (DE numerisch)
  - `Sa, 31.10.2026` (mit Wochentag)
- **Kurzes Datum** (Chart-Achse, Tooltip-Datum, kompakte Anzeigen):
  - `31.10.` (Tag.Monat) — **Default**
  - `31. Okt` (Monatswort)

### Chart-Achse: automatische Ausdünnung je Zeitspanne
Die X-Achse wählt die Granularität **automatisch** anhand der sichtbaren Zeitspanne; das Kurz-Preset
steuert nur, **wie der Tag aussieht**, wenn Tage gezeigt werden:

| Sichtbare Spanne | Achsen-Label |
|---|---|
| ≤ ~45 Tage | Tag im Kurz-Preset (`31.10.` bzw. `31. Okt`) |
| ~45 Tage – ~18 Monate | Monat (`Okt` bzw. `Okt 26` bei Jahreswechsel) |
| > ~18 Monate | Jahr (`2026`) |

Die Schwellen sind Richtwerte und werden an uPlots Tick-Dichte angepasst, sodass sich Labels nicht
überlappen. Umsetzung über uPlots `axes[0].values`-Funktion (bekommt die Tick-Werte + Tick-Inkrement
und darf pro Tick ein Label zurückgeben).

### Datenmodell
Additive Profil-Felder (wie bei `anzeige_skala`):

```
profil.datum_lang  : 'wort' | 'num' | 'wochentag'   (Default 'wort')
profil.datum_kurz  : 'num'  | 'wort'                (Default 'num')
```

Fehlen die Felder (Bestandsnutzer), greift der Default — kein Migrationsschritt nötig, keine sichtbare
Änderung außer der behobenen US-Achse.

### Zentrales Formatier-Modul
Neues (oder erweitertes) reines Modul mit **getesteten** Funktionen, das die Formatierung an EINER Stelle
bündelt. Heute gibt es Formatierung verstreut: `formatiereDatum`/`formatiereDatumKurz` + `MONATE`/
`MONATE_KURZ` in `felder.js`, ein eigenes inline `fmtDat` in `charts.js`, `toLocaleDateString` in
`profil.js`. Diese werden auf das zentrale Modul umgestellt.

Vorgeschlagene API (reine Funktionen, keine DOM-/Store-Abhängigkeit — Format wird als Parameter übergeben):

```
formatLang(iso, format)        → z. B. '31. Okt. 2026'
formatKurz(iso, format)        → z. B. '31.10.'
formatAchse(tickSekUTC, granularitaet, kurzFormat) → Label je Achsen-Tick
```

Die Screens lesen `profil.datum_lang`/`datum_kurz` aus dem Store und reichen sie an diese Funktionen
durch. **Wochentags-/Monatsnamen** kommen aus den bestehenden `MONATE`/`MONATE_KURZ` + einer neuen
`WOCHENTAGE_KURZ`-Konstante (`So`,`Mo`,…).

> **Zeitzonen-Falle beachten (ENTWICKLER-NOTIZEN):** Datums-Arithmetik auf ISO-Strings nutzt bewusst
> `Date.UTC`. Der Chart liefert seine X-Werte als UTC-Mitternachts-Sekunden → `formatAchse` liest mit
> `getUTC*` (wie das heutige `fmtDat`). `formatLang`/`formatKurz` bekommen ISO-Strings und parsen sie
> zeitzonenfrei (String-Split, nicht `new Date(iso)`), damit kein TZ-Versatz entsteht.

### Live-Anwendung
Wie Theme/Größe: Änderung im Profil ist sofort live (Store-Re-Render), auto-gespeichert mit
`{undobar:false}`.

---

## Thema 2 — Chart-Tooltip zeigt Ereignisse & Medikamente

### Entscheidung (Mockup Variante A/B)
Unter den Serien-Werten eine eigene Zeile mit **Chips**, abgetrennt durch `border-top`, umbrechend.
Farbgebung **identisch zum Verlauf**:

- **Ereignis** → `.chip.ev` (blauer Rand, transparent), mit Kategorie-Icon + Label (z. B. „Wiesn").
- **Medikament** → `.chip.med` (grauer Hintergrund). Strukturierte Spritze als `Präparat Dosis`
  (z. B. „MJ 12,5"); Rohtext-Altdaten als unveränderter Text (z. B. „OZ 10/2").

Keine Chips-Zeile, wenn der Tag weder Ereignis noch Medikament hat (Tooltip bleibt wie heute schlank).

### Verhalten
- **Mehrtägige Ereignisse** (z. B. Urlaub 10.–20.) erscheinen an **jedem** Tag im Zeitraum — konsistent
  zur Zuordnung im Verlauf. Zuordnung Tag↔Ereignis über die bestehende Bereichslogik (`von ≤ tag ≤ bis`).
- Mehrere Ereignisse/Medikamente am selben Tag → mehrere Chips, umbrechend.
- Das Tooltip-Datum nutzt das **Kurz-Format** aus Thema 1 (statt des heutigen fest-numerischen).

### Umsetzung
Im `setCursor`-Hook (`charts.js`) nach den Serien-Zeilen: Ereignisse des Tages über die vorhandene
Ereignis-Bereichslogik ermitteln, Medikament aus `tageseintraege[datum].spritze`. Chips als HTML
anhängen (gleiche Markup-Struktur wie Verlauf `.v-chips .chip`). Styles: bestehende Chip-Regeln
wiederverwenden bzw. unter `.ch-tooltip .ch-tip-chips` spiegeln.

> Die Chip-Erzeugung (Tag → Chip-Liste) wird als **reine Funktion** ausgelagert und getestet
> (Eingabe: Datum, Ereignis-Liste, Tageseintrag → Array von `{typ:'ev'|'med', label, icon?}`), damit
> die Logik unabhängig vom DOM prüfbar ist. Rendering bleibt im Hook.

### Platzierung/Breite
Tooltip bekommt eine `max-width`, damit Chips umbrechen statt den Tooltip über die Chart-Fläche hinaus
zu dehnen. Positionslogik (innerhalb der Fläche halten) bleibt; durch die variable Höhe ggf. `top`
nachführen, falls der Tooltip unten anstößt (minimaler Zusatz; sonst wie heute `top:10px`).

---

## Thema 3 — Doppeltap Übersicht-Mini-Chart → Charts-Screen

### Entscheidung
**Doppeltap/-klick** (nicht einfacher Tap) auf den Mini-Verlaufschart der Übersicht navigiert zum
Charts-Screen. Doppeltap ist bewusst „schwerer" auszulösen und kollidiert nicht mit horizontalem Swipe.

### Umsetzung
Auf dem Mini-Chart-Container der Übersicht (`dashboard.js`) ein `dblclick`-Listener → `navigiere('charts')`
(bestehende Navigation über `location.hash`). Für Touch zusätzlich eine kleine Doppeltap-Erkennung
(zwei `touchend` < ~300 ms, Finger nahe beieinander), da `dblclick` auf Touch nicht überall zuverlässig
feuert. Kein Eingriff in die Swipe-Ausschlusszonen nötig (Doppeltap ist keine horizontale Geste);
der Mini-Chart ist ohnehin kein Ausschluss-Element.

---

## Betroffene Dateien (Überblick)

| Datei | Änderung |
|---|---|
| `app/js/felder.js` oder neues `app/js/datum.js` | Zentrales Formatier-Modul + `WOCHENTAGE_KURZ`; reine Fn `formatLang`/`formatKurz`/`formatAchse` (getestet) |
| `app/js/schema.js` | ggf. Default-Konstanten für `datum_lang`/`datum_kurz` |
| `app/js/screens/profil.js` | Zwei neue Preset-Auswahlen in „Darstellung"; Backup-Datum über Formatierer |
| `app/js/screens/charts.js` | Achsen-`values`-Funktion (Ausdünnung + Kurz-Format); Tooltip um Chips erweitert; reine Chip-Fn |
| `app/js/screens/verlauf.js` | Monatsgruppen/Chips weiter wie gehabt; lange Daten über Formatierer |
| `app/js/screens/dashboard.js` | Doppeltap-Handler auf Mini-Chart |
| `app/css/app.css` | `.ch-tooltip .ch-tip-chips` + Chips im Tooltip; `max-width` Tooltip |
| `app/css/…` Profil | Layout der zwei neuen Auswahlzeilen (Muster wie Design/Größe) |
| `tests/` | Datums-Formatierer (lang/kurz/Achse), Tooltip-Chip-Funktion |

## Tests
- **Datums-Formatierer:** je Preset lang/kurz korrekt; Achsen-Ausdünnung an den Spannen-Schwellen
  (Tag/Monat/Jahr); Jahreswechsel im Monatslabel; Schaltjahr/1-stelliger Tag; TZ-frei (kein Versatz).
- **Tooltip-Chips:** Tag ohne Ereignis/Med → leere Liste; strukturierte Spritze → `Präparat Dosis`;
  Rohtext → unveränderter Text; mehrtägiges Ereignis am mittleren Tag enthalten; mehrere Chips.
- **Browser-Verifikation** über `http://localhost:8000/test/` (echte Daten, Cache per CDP umgehen),
  hell + dunkel; Achse in 30/180/Gesamt; Tooltip mit/ohne Chips; Profil-Umschaltung live;
  Doppeltap-Navigation. Touch-Teile am Gerät durch Nutzer (Playwright bildet Android-Touch nicht
  zuverlässig ab).

## Version / Deploy
Nach Umsetzung Version an **beiden** Stellen gleich hochzählen: `app/js/version.js` **und** `BUILD` in
`app/sw.js` (aktuell v75 → v76). Push macht der Nutzer selbst.

## Bewusst NICHT im Scope (YAGNI)
- Kein Freitext-Format, kein US-Preset (DE-Nutzung), keine Zeit-Anzeige (nur Datum).
- Keine Ereignis-Marker direkt auf der Chart-Linie (nur im Tooltip) — separat denkbar, hier vertagt.
- Kein `erfasst_am`-Zeitstempel (bleibt wie früher verworfen).
