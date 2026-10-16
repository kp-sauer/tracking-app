# tracking-app

Kleines, über mehrere Sessions wachsendes Projekt rund um Gewichts- und Gesundheits-Tracking.
Dieses README hält den aktuellen Stand und das Verständnis der Datenquelle fest, damit spätere
Sessions ohne weiteren Kontext weiterarbeiten können.

> **Projektziel:** siehe Abschnitt [App-Konzept](#app-konzept-ziel) weiter unten. Der Daten-Kontext
> (Analyse der Excel) ist vollständig erfasst und bleibt als Referenz unten stehen.

> ## 🚦 Aktueller Stand (2026-10-16)
>
> **v1 ist funktional fertig & abgenommen.** Seitdem läuft das **Design-/UX-Feintuning** Screen für
> Screen (clean, iOS-artig; Weiß/Grau als Basis, Blau als einziger Akzent). **Alle Screens sind
> feingetunt & im Browser verifiziert — das Design-/UX-Feintuning ist ABGESCHLOSSEN.**
>
> **Fertig & im Browser verifiziert:**
> - **Fundament/Shell** — Theme-Toggle (hell/dunkel/system), zentrales 4px-Spacing-System, Kopf mit
>   dynamischem Screen-Namen + TEST-Badge, untere Tab-Leiste.
> - **Service-Worker** auf *network-first* umgestellt → App-Updates kommen sofort an (vorher zäh).
> - **Profil** — Stammdaten (mit „Stammdaten speichern"-Button), **Ziel-Bereich** (Zielgewicht +
>   bis zu 3 optionale Zwischenziele, je als BMI *oder* kg eingebbar), **Darstellung** inkl. neuer
>   **Anzeigegröße** (stufenlose UI-Skalierung 90–130 % per `zoom`), Backup. Darstellung & Ziele
>   wirken sofort live und speichern automatisch.
> - **Übersicht/Dashboard** — Hero (aktuelles Gewicht + 7-Tage-Trend + Ø, filter-unabhängig),
>   **Zeitfilter** (Gesamt / Jahr / letzte N Tage), KPI-Grid (BMI mit WHO-Einordnung inkl.
>   Adipositas-Grade, Verlust, Max/Min), Ziel-Balken mit Zwischenziel- und WHO-Markern,
>   Mini-Verlaufschart (Tagesgewicht + 7-Tage-Schnitt).
> - **Eingabe** — Datum (mit **Tag-vor/zurück-Pfeilen** ‹ › neben dem Picker; vorwärts stoppt bei
>   heute) → Gewicht-Hero (0,1-kg-Stepper, Vorschlag = letztes Gewicht) → Ereignis →
>   Medikament. Überschreiben-Dialog bei vorhandenem Tag; Editier-Modus (gespeicherte Werte beim
>   Aufklappen vorbelegt); Kategorien Urlaub/Fest/Krankheit/Wiesn/Sonst; „Medikament"/„Anwendung Nr."
>   bewusst neutral (künftig evtl. Tabletten).
> - **Verlauf** — nach Monat gruppiert, Karten-Zeilen (Datum-Block + Gewicht + Vortages-Differenz +
>   Medikament-/Ereignis-Chips). **Edit-Stift** → öffnet Eingabe mit dem Datum; **✕** → eigenes
>   rotes Lösch-Dialog-Overlay (kein natives confirm mehr). **Undo/Redo** (Pfeile im Kopf, nur hier
>   sichtbar): app-weit über alle Datenänderungen, session-only.
> - **Charts** — interaktives uPlot-Chart mit **Zeitfilter** (Gesamt / Jahr / letzte N Tage),
>   **zuschaltbare Serien** (Gewicht, 7-Tage-Durchschnitt, Trend, Zielgewicht; Standard: Gewicht +
>   7-Tage-Ø aktiv), schlankes Tooltip (Datum + kg je Serie), Min/Max-Marker, lineare Trendlinie.
>   **Vollbild-Modus** (Querformat automatisch, oder manuell per Icon; Schließen per X).
>
> Design-Specs liegen in `docs/specs/`. Mockups (Wegwerf, HTML) in `mockups/`.
> Der laufende Feintuning-Stand (detailliert) steht in
> **[`docs/FEINTUNING-FORTSCHRITT.md`](docs/FEINTUNING-FORTSCHRITT.md)**.

## App-Konzept (Ziel)

Eine **Progressive Web App (PWA)** zum täglichen Gewichts-Tracking – läuft im Browser auf
**Android und iPhone ohne App-Store-Installation** (optional „Zum Startbildschirm hinzufügen"),
funktioniert offline.

### Eingabewerte (vollständig)

**Pro Tag (Tageseingaben):**

1. **Datum** – mit „heute" vorbelegt, frei änderbar (zum Nachtragen vergessener Tage).
2. **Gewicht (kg)** – Tageswert.
3. **Spritze (optional, nur an Injektionstagen):**
   - **Präparat:** Ozempic (OZ) / Mounjaro (MJ) / Wegovy (WG)
   - **Dosis (mg):** Auswahlliste je Präparat – MJ: 2.5/5/7.5/10/12.5/15 · OZ: 0.25/0.5/1/2 ·
     WG: 0.25/0.5/1/1.7/2.4
   - **Pen-Anwendung X:** laufende Anwendungs-Nr. aus dem aktuellen Pen (nur X zählen, kein festes
     Y; Pen-Wechsel wird manuell eingetragen). Zweck: Pen-Verbrauch/Nachkauf.
   - Das alte Excel-`n/m`-Format wird **nicht** nachgebaut (war nur Notation) – siehe Import unten.
4. **Ereignis/Kontext (optional, Einzeltag ODER Zeitraum):** erklärt Gewichtsschwankungen.
   - **Zeitraum-fähig** (z. B. Urlaub 10.–20.), nicht nur Einzeltag.
   - **Kategorien** zum Antippen: **Urlaub · Feiertag/Fest · Krankheit · Sport · Wiesn**.
   - **+ Freitext** für Außergewöhnliches.

**Stammdaten (global, selten geändert):**

5. **Körpergröße** (aktuell 1,75 m, änderbar) – geht in den **BMI** ein.
6. **Geschlecht** – m / w / divers.
7. **Geburtsdatum** – volles Datum; Alter wird daraus tagesaktuell berechnet.

→ Geschlecht + Alter dienen **Analysen/Einordnungen** (Alters-/Geschlechtsvergleiche) und
fließen **nicht** in die bestehenden Excel-Berechnungen (BMI etc.) ein.

Abgeleitet/berechnet (keine Eingabe): KW, Wochentag, Diff, W-AVG, BMI, Alter, alle KPIs, Max/Min,
Gesamtverlust, BMI-Zieltabelle.

### Profil & Mehrbenutzer

- **Generische Einzelperson-App: 1 Profil pro Gerät/Browser.** Keine fest verdrahteten Werte,
  kein Login, keine gemeinsame Benutzerverwaltung. „Für andere verwendbar" = jede Person startet
  ihre eigene Instanz auf ihrem Gerät (z. B. Partnerin mit eigener leerer App).
- **Erststart = Onboarding:** Startet die App leer, führt ein Onboarding-Screen durch die
  Stammdaten-Eingabe (Größe, Geschlecht, Geburtsdatum), danach direkt in die App.
- **Profil-Icon** (z. B. oben rechts): Stammdaten jederzeit änderbar.
- Dadurch ist **Körpergröße kein fest verdrahteter Wert mehr** (1,75 m wird nur noch
  Default-Vorschlag im Onboarding); der BMI rechnet mit der Profil-Größe.

### Funktionsumfang v1 (voll inkl. Charts)

> Dies beschreibt den v1-Konzeptstand. Der aktuelle (feingetunte) Stand pro Screen steht im
> Status-Block oben bzw. in `docs/FEINTUNING-FORTSCHRITT.md`. Insbesondere: Zielgewicht +
> Zwischenziele sind inzwischen **im Profil frei einstellbar** (BMI oder kg), und das Dashboard hat
> einen **Zeitfilter**.

- **Onboarding** beim ersten Start (Stammdaten).
- **Eingabe-Screen** (schnell): Datum, Gewicht, optional Spritze, optional Ereignis.
- **Dashboard/KPIs:** aktuelles Gewicht, Diff zum Start, BMI (mit WHO-Einordnung), Fortschritt
  Richtung Zielgewicht (Ziel + Zwischenziele im Profil einstellbar), Max/Min, Verlust;
  Zeitfilter (Gesamt/Jahr/Tage).
- **Diagramme:** Tagesgewicht-Linie (lineare Trendlinie) + Wochen-Durchschnitt-Balken
  (2026-Logik als Vorbild).
- **Verlaufsliste:** alle Einträge chronologisch, editierbar/löschbar.
- **Profil-Verwaltung:** Stammdaten, Ziel/Zwischenziele, Darstellung (Theme + Anzeigegröße), Backup.

### Betriebslogik: Testmodus ↔ Produktiv

> ✅ **GEKLÄRT (2026-10-14).** Vollständiges Design:
> [`docs/specs/2026-10-14-test-produktiv-mechanik-design.md`](docs/specs/2026-10-14-test-produktiv-mechanik-design.md).
> Der frühere Vorschlag eines *Testmodus-Schalters innerhalb einer App* wurde **verworfen**
> zugunsten zweier physisch getrennter Welten (zwei URLs).

**Grundprinzip – zwei getrennte Welten, kein Umschalter:** Dieselbe Codebasis wird an zwei URLs
bereitgestellt – `.../tracking-app/` (**Produktiv**) und `.../tracking-app/test/` (**Test**). Weil
IndexedDB an den Origin/Pfad gebunden ist, sind beide Datenbestände **technisch unfähig, sich zu
sehen** – es *kann* nichts ungefragt zwischen ihnen springen (die harte Trennung ist durch den
Browser erzwungen, nicht durch App-Logik). Jede Welt kennt ihre Identität über eine Konstante
`WELT = "test" | "produktiv"` (aus dem Pfad abgeleitet, **nicht** aus gespeicherten Daten → kein
Testmodus-Flag im Profil nötig).

**Visueller Marker:** Die Test-Welt trägt dauerhaft einen unübersehbaren Balken „TESTMODUS"; die
Produktiv-Welt hat keinen – ihr normales Erscheinungsbild *ist* das Signal „echt".

**Datenbefüllung – Seed und Restore streng getrennt:**
- **Seed (Erstbefüllung aus Excel):** nur möglich, solange die Welt **leer** ist; danach gesperrt.
  Test jetzt (volle Historie), Produktiv später beim Scharfschalten (dann aktueller Excel-Stand).
- **Restore (Recovery aus eigenem Backup):** jederzeit möglich, bei vorhandenem Bestand immer mit
  expliziter Rückfrage (Ersetzen oder Merge).
- **Welt-Prüfung bei jedem Import:** jede Datei trägt intern eine Herkunfts-Kennung
  (`welt`, Zeitstempel). Datei derselben Welt → läuft durch; **fremde** Welt → **hart blockiert**,
  keine Umgehung.

**Konvertierungs-Skript:** eigenständiges Skript (nicht in der App), liest `Blutwerte.xlsx` nur,
schreibt `seed_<welt>_<YYYY-MM-DD_HHMM>.json`. Zeitstempel im Namen → nie Überschreiben; `welt` als
Aufruf-Parameter, landet in Name und JSON.

**Wichtig / Source of Truth:**
- **Bis zur Freigabe bleibt die Excel führend** – echte Tageswerte werden weiter in die *Excel*
  gepflegt, die App (Test-Welt) ist reine Testumgebung.
- Scharfschalten = Produktiv-Welt einmalig mit frischem Excel-Seed befüllen; in der Test-Welt
  getippte Werte wandern **nie** in den Produktivbestand (getrennte IndexedDB).

**Spritzen-Historie beim Import (mit Unschärfe – pragmatisch):**
- **MJ:** eindeutig ableitbar. Die frühen Marker (`1/1 … 5/1`, `1/2`, `2/2`) waren damals
  **Injektions-/Pen-Zählung**, nicht Dosis → **alle = 10 mg**. Ab `12/x` steht die „12" für die
  Dosis → **12,5 mg**. Also: alles vor `12/x` = 10 mg, ab `12/x` = 12,5 mg. Keine Schätzung nötig.
- **OZ / WG:** Dosis wechselte und ist nicht mehr nachvollziehbar → alte `n/m`-Angaben als
  **unveränderter Rohtext** übernehmen (z. B. „OZ 10/2"), nicht in mg interpretieren.

### Architektur-Entscheidung (GEKLÄRT)

Nach Abwägung dreier Wege (reine Server-DB / Hybrid-Sync / offline-first lokal) gewählt:
**offline-first, lokal auf einem Hauptgerät, Backup per Datei-Export.** Begründung: oberstes Ziel
ist „App funktioniert immer, online wie offline"; echter Mehrgeräte-Sync wird nicht gebraucht
(ein Hauptgerät reicht); keine laufenden Kosten; Gesundheitsdaten bleiben beim Nutzer.

| Aspekt | Entscheidung |
|---|---|
| **Form** | PWA (installierbar „zum Startbildschirm", Vollbild), offline-fähig via Service Worker |
| **Tech-Stack** | Vanilla JS + leichte Chart-Lib, **kein** Build-Step |
| **Hosting** | kostenloses Static-Hosting (z. B. GitHub Pages); App per URL aufs Handy |
| **Datenspeicher** | **IndexedDB** lokal im Browser (Android + iOS); Gerät = Source of Truth |
| **Sync** | kein Sync-Server; ein Hauptgerät, Desktop nur zum Anschauen (via Backup/URL) |
| **Backup** | halbautomatischer **Export als JSON** über native Teilen-Funktion (→ Drive/iCloud); App erinnert nach X Einträgen |
| **Restore/Import** | JSON importieren mit Auswahl **Ersetzen** oder **Zusammenführen (Merge)** |
| **Excel-Historie** | einmalig **vorab per Tool zu JSON** konvertiert; App hat nur „JSON importieren" (kein Excel-Parser im Browser) |

**Datenmodell (IndexedDB):** 3 getrennte Bereiche – (1) **Profil** (Größe, Geschlecht,
Geburtsdatum – **kein** Testmodus-Flag, die Welt ergibt sich aus der URL), (2) **Tageseinträge** (Datum=Key, Gewicht, optional Spritze
eingebettet + `historie_rohtext`), (3) **Ereignisse** (Von–Bis, Kategorie,
Freitext – separat, da zeitraumüberspannend; **kein** Verweis vom Tageseintrag, Zuordnung
Tag↔Ereignis wird aus dem Von–Bis-Bereich berechnet). **Nicht gespeichert**, sondern bei Anzeige aus
Rohdaten berechnet: KW, Wochentag, Diff, W-AVG, BMI, Alter, KPIs, Max/Min, Gesamtverlust,
Zielgewichte.

> Finales Datenmodell-Schema (Feld-Typen, Export-Hülle): siehe
> [`docs/specs/2026-10-14-v1-gesamt-design.md`](docs/specs/2026-10-14-v1-gesamt-design.md).

**Screens:** Onboarding (1. Start) · Eingabe (Start, schnell) · Dashboard/KPIs · Diagramme
(mit Ereignis-Markierungen) · Verlaufsliste. Navigation per **Tab-Leiste unten** (reine
Screen-Navigation, NICHT die Excel-Jahre-Tabs). Profil-Icon oben rechts: Stammdaten · Backup
Export/Import · (kein Test-/Produktiv-Schalter → Trennung über zwei URLs, siehe Betriebslogik).

**Berechnungs-Kern:** isoliertes Modul reiner Funktionen, das die **Excel-Formeln spiegelt**;
wird gegen bekannte Excel-Werte (BMI, Gesamtverlust, W-AVG an Stichtagen) getestet → App liefert
dieselben Zahlen wie die Excel.

**Icons:** alle Icons sind **inline-SVG im Feather-Stil** (dünne Striche, `stroke="currentColor"`,
`fill="none"`). **Kein externes Icon-Set, keine Abhängigkeiten** – SVG direkt im Markup. Größe in
`em` → skaliert mit der Schriftgröße. Farbe folgt `currentColor` → wechselt automatisch mit dem
Hell-/Dunkel-Modus mit.

**Hell-/Dunkel-Modus:** Default folgt der **System-Einstellung** (`prefers-color-scheme`); ein
Schalter im Profil (**hell / dunkel / system**) übersteuert manuell, die Wahl wird in IndexedDB
(beim Profil) gespeichert. Umsetzung über **CSS Custom Properties** (Farb-Variablen pro Theme) →
alle Farben und `currentColor`-Icons schalten automatisch um, ohne Nachrüsten pro Komponente.

### Noch offen (später vertiefen)

- **Test-/Produktiv-Mechanik** – ✅ **GEKLÄRT (2026-10-14),** siehe Abschnitt „Betriebslogik"
  oben und `docs/specs/2026-10-14-test-produktiv-mechanik-design.md`.
- **BMI-Zielgewichte sind größenabhängig:** die konkreten Werte (91,875 kg @ BMI 30; 76,5625 kg
  @ BMI 25) gelten nur bei 1,75 m. In der generischen App müssen sie **aus der Profil-Größe
  berechnet** werden (Zielgewicht = BMI-Schwelle × Größe²), nicht fest hinterlegt.

---

## Datenkontext (Analyse der Quelldatei)

## Verzeichnisstruktur

```
tracking-app/
├── Blutwerte.xlsx      # Original-Quelldatei (UNANGETASTET – nur lesen, nie überschreiben)
├── markdown/           # Aus der Excel erzeugte Markdown-Dateien
│   ├── Gewicht_2024.md
│   ├── Gewicht_2025.md
│   └── Gewicht_2026.md
├── docs/
│   └── specs/          # Design-Dokumente (Specs)
│       └── 2026-10-14-test-produktiv-mechanik-design.md
└── README.md           # diese Datei
```

## Datenquelle: `Blutwerte.xlsx`

Die Excel hat 6 Tabs. **Relevant für dieses Projekt sind nur die drei Gewichts-Tabs**
(`Gewicht 2024`, `Gewicht 2025`, `Gewicht 2026`). Die Tabs `Blutwerte`, `Harnsäure` und
`Ärzte` werden bewusst **ignoriert** (letzterer enthält trotz des Namens Tauch-Equipment-Wartung).

Die drei Gewichts-Tabs sind **historisch über die Jahre gewachsen**. **`Gewicht 2026` ist das
aktuelle, lebende Arbeitsblatt**; 2024 und 2025 sind abgeschlossene historische Stände mit
teils abweichendem Spalten-Layout.

### Aufbau von `Gewicht 2026` (maßgebliches Layout)

**Tagestabelle (ab Zeile 2):**

| Spalte | Feld | Art |
|---|---|---|
| C | Datum | **Eingabe** |
| A | Kalenderwoche (KW) | abgeleitet aus C |
| B | Wochentag | abgeleitet aus C |
| D | Gewicht (kg) | **Eingabe** |
| E | Diff (zum Vortag) | berechnet |
| F | W AVG Diff (Wochen-Durchschnitt der Diff) | berechnet |
| G | W AVG (kg) (Wochen-Durchschnitt Gewicht) | berechnet |

→ **Nur C (Datum) und D (Gewicht) werden eingegeben.** Alles andere ist abgeleitet/berechnet.

**Hinweis Spalte F – Doppelnutzung:** Spalte F enthält je nach Zelltyp **zweierlei**:
- **Zahl** = berechnete W-AVG-Diff (`=AVERAGE(vorwoche)-AVERAGE(aktuelle woche)`), nur ~1×/Woche belegt.
- **Text** = Medikamenten-Marker (siehe unten). Nie beides in derselben Zelle.

Im Markdown-Export sind diese sauber getrennt: Zahlen → Spalte „W AVG Diff", Texte → Spalte „Medikament".

### Medikamenten-Marker (Spalte F, vereinzelt H)

In den Tagestabellen 2026 und 2025 stehen **Medikamenten-Einträge** (GLP-1-Therapie). Diese
markieren Injektions-/Dosis-Zeitpunkte, meist im ~7-Tage-Rhythmus (Injektionstag).

**Kürzel:**
- **OZ / „Ozempic"** = Ozempic (Semaglutid)
- **MJ** = Mounjaro (Tirzepatid)
- **WG** = Wegovy (Semaglutid)

**Format `n/m` – uneinheitlich je nach Präparat:**
- **MJ:** `Dosis / Woche` (z. B. `MJ 12/3` = Mounjaro Dosisstufe 12, Woche 3)
- **OZ und WG:** `wievielte Spritze / Woche` (z. B. `OZ 10/2` = 10. Spritze, Woche 2)

**Verlauf:**
- **2026:** OZ (Jan–Apr) → Umstieg auf **MJ** ab Ende Juni 2026. 22 Marker.
- **2025:** „Ozempic"/OZ (ab Jan) → **WG** (Okt/Nov) → zurück zu OZ (Dez). 35 Marker.

> Datenhygiene: Einige Marker lagen im Original in Spalte **H** statt F (verrutschte Eingaben) –
> pro Zeile ist aber nie F **und** H belegt, daher im Export zu einer Spalte „Medikament"
> zusammengeführt. Spalte H enthält sonst keine Tagesdaten.

**KPIs (Zeile 1, ab Spalte H):**

- **Block 1 – aktuelles Jahr (H–O):**
  - H = Label „Start" · I = Startgewicht des Jahres
  - J = Label „Aktuell" · K = letztes/aktuelles Gewicht (aus Tabelle gesucht)
  - L = Label „Diff" · M = Differenz I − K
  - N = Label „BMI" · O = aktueller BMI-Wert
  - ⚠️ **Bekannter Fehler:** H1 steht im Original als **„Start 2025"**, müsste **„Start 2026"**
    heißen (Copy-&-Paste-Fehler). In `markdown/Gewicht_2026.md` ist dies auf „Start 2026"
    **korrigiert** (mit Kommentar); die Excel selbst ist unverändert.
- **Block 2 – Max/Min aktuelles Jahr (Q–X):** Maximum- und Minimum-Gewicht des Jahres je mit
  Datum, plus deren Differenz (jeweils Label + Wert).
- **Block 3 – Gesamt (Z–AC):** maximaler Gewichtsverlust seit **Start <Startdatum>** bis heute
  (Label + berechneter Wert).

### Abweichungen in den historischen Tabs

- **`Gewicht 2025`:** gleiches Grundlayout wie 2026 (Spalten A–G, KPIs ab H). KPI-Block hat
  ebenfalls „Start 2025" (dort korrekt).
- **`Gewicht 2024`:** **anderes Layout.** Spalte A = Datum, B = Gewicht, C = Datum (identisch zu A),
  D = Ozempic-Diff. KPI-Block in Zeile 1 besteht aus zwei betitelten Gruppen (`Ozempic` und
  `GESAMT`) mit Wert+Einheit-Tripeln sowie Max/Min/Diff.

### BMI-Referenztabelle auf Tab 2024 (O4:Q16)

Zusätzlich zu den KPIs liegt auf dem 2024-Blatt eine **BMI-Nachschlagetabelle**.
Spalten: **O = Gewicht (kg)** · **P = Körpergröße (1,75 m, fix)** · **Q = BMI = O / P²**.

Reihe von Gewichtsstufen (120 → 75 kg) mit resultierendem BMI. Besonderheiten:

- **O4 ist blattübergreifend:** `='Gewicht 2025'!K1` → zieht live das „Aktuell"-Gewicht aus 2025
  (aktuell <Gewicht> kg → BMI <Wert>). Die Tabelle sitzt zwar auf dem historischen 2024-Blatt,
  referenziert aber 2025.
- **Zwei Zeilen rechnen umgekehrt** (`O = Q*P²`, d. h. BMI vorgegeben → Zielgewicht abgeleitet):
  - **BMI 30** (Adipositas-Grenze) → Zielgewicht **91,875 kg**
  - **BMI 25** (oberes Normalgewicht) → Zielgewicht **76,5625 kg**
- **→ Diese beiden Werte sind bewusste Zielgewichte** (vom Nutzer bestätigt). Relevante Fachlogik
  für ein künftiges Tracking-Tool: BMI-Schwellen 25 und 30 als Meilensteine.

## Berechnungslogik (Formeln aus der Excel)

Aus den tatsächlichen Zellformeln rekonstruiert – maßgeblich, falls die Werte später neu
berechnet oder in eine App überführt werden.

### Tagestabelle 2026/2025 (identisch)

| Spalte | Formel (Beispiel Zeile) | Bedeutung |
|---|---|---|
| B (Tag) | `=C2` | identisch zum Datum, nur als Wochentag formatiert |
| E (Diff) | `=D2-D3` | Vortag − heute; **positiv = Abnahme** |
| G (W AVG kg) | `=AVERAGE(D2:D8)` | gleitender 7-Tage-Durchschnitt des Gewichts |
| F (W AVG Diff) | `=D3-G8` | Gewicht vor 7 Tagen − aktueller 7-Tage-Schnitt |

→ F/G sind erst **ab Zeile 8** belegt (vorher liegen keine 7 Tage vor). A (KW) ist manuell/fortlaufend.

### KPI-Formeln 2026

- **Block 1 (H–O):**
  - `I1 = D2` → Startgewicht des Jahres (erster Tageswert)
  - `K1 = XLOOKUP(MAX(Datum); Datum; Gewicht)` → Gewicht am jüngsten erfassten Datum („Aktuell")
  - `M1 = I1 - K1` → Differenz Start − Aktuell
  - `O1 = K1 / 1.75^2` → **BMI; Körpergröße fest 1,75 m** (bestätigte Projekt-Konstante)
- **Block 2 (Q–X):** `R1 = MAX(Gewicht)`, `U1 = MIN(Gewicht)` je mit `XLOOKUP` aufs Datum;
  `X1 = R1 - U1`.
- **Block 3 (Z–AC) – blattübergreifend:** `AA1 = 'Gewicht 2024'!B2 - K1` → allererstes Gewicht
  **<Startgewicht> (<Startdatum>)** minus aktuelles Gewicht; `AC1 = 'Gewicht 2024'!C2` (Startdatum).
  → **2026 referenziert 2024** für den Gesamtverlust; die Tabs sind also verkettet, nicht unabhängig.

### KPI-Formeln 2024 (abweichend)

- `Ozempic` (E1, Array): `=$B$20 - <letztes Gewicht>` → Abnahme ab Zeile 20 (Ozempic-Start).
- `GESAMT` (M1, Array): `=$B$2 - <letztes Gewicht>` → Abnahme ab allererstem Wert.
- Max/Min analog 2026 über Named Range `Gewicht_2024`.

### Named Ranges (Eigenheiten)

| Name | Scope | Zeigt auf |
|---|---|---|
| `Gewicht_2024` | global | `'Gewicht 2024'!$B$2:$B$167` |
| `Werte_2024` | global | `'Gewicht 2024'!$B$2:$C$172` |
| `Datum_2025`, `Gewicht_2025` | Blatt **2026** | je `'Gewicht 2026'!$C/$D$2:364` |
| `Datum_2025`, `Gewicht_2025` | Blatt **2025** | je `'Gewicht 2025'!$C/$D$2:354` |

⚠️ **Benennungs-Altlast (nur dokumentiert, nicht geändert):** Die sheet-scoped Named Ranges
heißen auf **jedem** Blatt `_2025`, zeigen aber korrekt auf das jeweils eigene Blatt. Gleiches
Copy-&-Paste-Muster wie bei „Start 2025" in H1. **Die KPIs rechnen also korrekt** – nur die
Namen sind irreführend. Kein Handlungsbedarf, nur beim Lesen der Formeln beachten.

## Diagramme (Charts in der Excel)

Es gibt **5 Charts**, verteilt auf die 3 Gewichts-Blätter. **`Gewicht 2026` ist führend;
`Gewicht 2025` ist chart-identisch dazu; `Gewicht 2024` hat nur eine einfache Grafik.**

| Blatt | Chart | Typ | Titel | X-Achse | Y-Werte | Y-Skala | Trendlinie |
|---|---|---|---|---|---|---|---|
| **2026** | 1 | Linie | Tägliches Gewicht (kg) | Datum `C2:C301` | Gewicht `D` | 88–98 | linear |
| **2026** | 2 | Balken | Wöchentlicher Durchschnitt (kg) | (impliz.) | W-AVG `G` | 88–98 | gleitender Ø |
| **2025** | 3 | Linie | Tägliches Gewicht (kg) | Datum `C2:C334` | Gewicht `D` | 92–105 | linear |
| **2025** | 4 | Balken | Wöchentlicher Durchschnitt (kg) | (impliz.) | W-AVG `G` | 92–105 | gleitender Ø |
| **2024** | 5 | Linie | (ohne Titel) | Datum `C20:C172` | Gewicht `B20:B172` | auto | linear |

**Maßgebliches Chart-Setup (2026, = Vorbild für alles Weitere):**

- **Zwei Diagramme pro Jahr:**
  1. *Tägliches Gewicht* – Linien-Chart, X = Datum, Y = Gewicht (Spalte D), keine Marker,
     keine Glättung, **lineare Trendlinie** (Gesamt-Trend).
  2. *Wöchentlicher Durchschnitt* – Balken-Chart über W-AVG (Spalte G), **Trendlinie =
     gleitender Durchschnitt**.
- **Y-Achse manuell skaliert** pro Jahr (2026: 88–98 kg, 2025: 92–105 kg) – nicht automatisch;
  bei einer Neuimplementierung sollte die Skala sinnvoll an den Wertebereich des Jahres gekoppelt
  werden.
- **Serienfarben** sind Theme-/Auto-Farben (nicht fest kodiert).

**Befunde:**

- **Feste Range-Enden statt dynamisch:** Charts gehen bis Zeile 301 (2026) bzw. 334 (2025) –
  feste Zeilennummern mit Puffer über die tatsächlichen Daten hinaus. Leere Vorlagezeilen am
  Ende erscheinen im Chart als flache/leere Fortsetzung (gleiche Logik wie bei den
  Vorlagezeilen im Tabellen-Export).
- **2024-Chart beginnt bei Zeile 20** = Ozempic-Start (passt zur `Ozempic`-Formel `$B$20`); zeigt
  bewusst nur den Ozempic-Zeitraum, nicht die Erstmessung von 2023.
- Der Balken-Chart hat keine explizite X-Kategorie – er nutzt die implizite Zeilenreihenfolge.

## Konvertierung Excel → Markdown

Bisheriger Stand der erzeugten `.md`-Dateien:

- **Eine Datei pro Gewichts-Tab**, Werte 1:1 aus der Excel übernommen.
- Jede Datei: Abschnitt **„Kennzahlen"** (KPI-Block aus Zeile 1 als Liste) + Abschnitt
  **„Verlauf"** (Tageswerte als Tabelle, alle erfassten Tage).

**Bewusste Darstellungsänderungen gegenüber dem Original (keine Wert-Änderungen):**

1. **Zahlen auf 2 Nachkommastellen gerundet dargestellt** (z. B. `0.45898…` → `0.46`). Die vollen
   Nachkommastellen stehen damit nicht mehr in der `.md`.
2. **Leere Vorlagezeilen am Jahresende entfernt** (Zeilen ohne Datum/Gewicht, im Original als
   `00:00:00` / `#DIV/0!` sichtbar). Gefiltert nach: Zeile nur behalten, wenn Datum **und**
   Gewicht vorhanden.
3. **KPI-Block oben als Liste abgetrennt** (statt breiter 29-Spalten-Tabelle).
4. **H1 in 2026 korrigiert** zu „Start 2026" (siehe oben).
5. **Spalte „Medikament" ergänzt** (2026/2025): Medikamenten-Marker aus Spalte F/H in eine eigene
   Spalte gezogen und von der berechneten W-AVG-Diff getrennt (siehe Abschnitt
   „Medikamenten-Marker").

Resultierende Zeilenzahlen: 2024 = 166 Tage · 2025 = 328 Tage · 2026 = 254 Tage (bis 14.10.2026).

> Hinweis: In `Gewicht_2026.md` steht bei einzelnen Tagen in der Diff-Spalte ein Textvermerk
> statt einer Zahl (z. B. `MJ 12/6`) – 1:1 aus der Excel übernommen.

## Arbeitsregeln für dieses Projekt

- **`Blutwerte.xlsx` niemals überschreiben** – ausschließlich lesen.
- Beim Lesen der Excel: Datei kann zeitweise in Excel geöffnet/gesperrt sein (`PermissionError`),
  dann einfach erneut versuchen.
- Umlaute/Sonderzeichen im Terminal können als `�` erscheinen – das ist nur die Anzeige; die
  Dateien selbst sind UTF-8-korrekt.
