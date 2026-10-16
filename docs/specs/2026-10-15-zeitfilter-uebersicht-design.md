# Design: Zeitfilter auf der Übersicht

> **Status:** Entwurf, vom Nutzer abschnittsweise bestätigt (2026-10-15). Teil des Dashboard-
> Feintunings. Mockup: `mockups/06-uebersicht.html` (Filter) + `mockups/07-zeitfilter.html`.
> Nächster Schritt nach Freigabe: Umsetzung in verifizierbaren Schritten (TDD für die reine Logik).

## Problem & Hintergrund

Die Übersicht rechnet aktuell immer über den gesamten Datenbestand. Der Nutzer will den
Zeitraum einschränken können (z. B. nur 2026, oder die letzten 90/180/X Tage), woraufhin **alle**
Kennzahlen und der Verlauf nur noch diesen Zeitraum abbilden.

## Abschnitt 1 — Filter-Steuerung (UI)

Direkt **unter der Hero-Karte** (vom Nutzer so gewünscht), eine Zeile:

- Segmented **`Gesamt | Jahr | Tage`**.
- **Gesamt**: keine Zusatzkontrolle.
- **Jahr**: Jahres-Stepper `‹ 2026 ›` in derselben Zeile. Grenzen = erstes/letztes Datenjahr,
  Pfeile an den Rändern ausgegraut.
- **Tage**: Pills `90 · 180 · + Eigene`. „Eigene" blendet darunter ein Zahlenfeld mit −/+ Stepper-
  Pfeilen ein (Optik wie das Profil-Gewichtsfeld), frei eintippbar (1–3650).

Reichweite: **nur die Übersicht** (vorerst). Verlauf/Diagramme bleiben unberührt; die
Zeitfenster-Funktion wird aber so gebaut, dass sie dort später wiederverwendet werden kann.

## Abschnitt 2 — Zeitfenster-Funktion (reine Logik, TDD)

Neue reine Funktion, die aus der nach Datum sortierten Tagesliste (`nachDatumSortiert`) die
Einträge im gewählten Fenster zurückgibt. Vorschlag `imZeitfenster(sortierteTage, filter)` mit
`filter = { modus: 'gesamt'|'jahr'|'tage', jahr?, tage? }`.

- `gesamt` → alle Tage unverändert.
- `jahr` → nur Tage mit `datum.startsWith(String(jahr))` (ISO `YYYY-…`).
- `tage` → die letzten N Kalendertage **relativ zum letzten vorhandenen Eintrag** (nicht relativ zu
  „heute" — die App ist Testumgebung, „heute" wäre irreführend). Also: `grenze = letztesDatum − (N−1) Tage`, alle Einträge `≥ grenze`.

Leeres Fenster (keine Einträge im Zeitraum) ist ein gültiger Zustand → KPIs zeigen „–".

## Abschnitt 3 — Semantik der Kennzahlen bei aktivem Filter

Bestätigt vom Nutzer (die 3 kniffligen Fälle):

| Kennzahl | Verhalten im Fenster |
|---|---|
| **Hero (Gewicht + Trend + Ø)** | **IMMER global, filter-UNABHÄNGIG** (Nachtrag 2026-10-15): Das Hero zeigt stets den aktuellen Ist-Zustand — letztes eingetragenes Gewicht, aktueller 7-Tage-Trend (grün Abnahme / rot Zunahme), aktueller 7-Tage-Schnitt als Ø. Der Filter wirkt NUR auf KPI-Grid, Ziel und Chart. |
| **BMI** | aus dem letzten Fenster-Wert (Einordnung Normal/Übergewicht entsprechend) |
| **Verloren** | **innerhalb des Fensters**: erster − letzter Wert im Fenster. Kachel-Titel **dynamisch**: „Verloren in 2026" / „Verloren (letzte 90 Tage)". Nur bei Modus `gesamt`: echter Projekt-Gesamtverlust ab `ERSTES_GEWICHT_GESAMT` (`<Startgewicht>`), Titel „Gesamt verloren seit `<Startdatum>`". |
| **Maximum / Minimum** | nur **im Fenster** (+ jeweiliges Datum) |
| **Weg zum Ziel** | Start = **erster Wert im Fenster**, Ziel = Zielgewicht; Fortschritt dazwischen. Startwert mit anzeigen („von 93,2 kg"), damit ein fast leerer Balken bei kurzem Fenster verständlich ist. Bei `gesamt`: Start = `ERSTES_GEWICHT_GESAMT`. |
| **Verlauf-Chart** | nur Punkte **im Fenster**; W-AVG-Linie wird auf der Fenster-Teilmenge neu gerechnet |

## Abschnitt 4 — Betroffene Stellen (Umsetzung)

- `app/js/kpi.js` — `dashboardModell` bekommt den `filter` übergeben, wendet `imZeitfenster` an,
  liefert zusätzlich `verlustTitel`/`zielStart` passend zur Semantik oben. `imZeitfenster` selbst
  liegt bei den Daten-Helfern (`db.js`) oder in `kpi.js` — Entscheidung im ersten Schritt.
- `app/js/screens/dashboard.js` — hält den Filter-Zustand (lokal im Screen, nicht im Store, da nur
  Übersicht), rendert die Filterleiste, reicht den Filter an `dashboardModell`, zeichnet neu bei
  Änderung. Chart nur mit Fenster-Daten.
- **Keine** Änderung an `verlauf.js` / `charts.js` in diesem Schritt.

## Tests (TDD)

- `imZeitfenster`: gesamt (unverändert), jahr (nur passendes Jahr, Jahreswechsel-Grenzen),
  tage (N relativ zum letzten Eintrag, Rand = genau N, leeres Fenster → []), unsortierte/leere
  Eingabe robust.
- `dashboardModell` mit Filter: Max/Min nur im Fenster; Verloren = erster−letzter im Fenster;
  `gesamt` nutzt weiterhin `<Startgewicht>`; leeres Fenster → alle Felder null.

## Offen für die Umsetzung (nicht Teil dieses Designs)

- Genaue Platzierung von `imZeitfenster` (db.js vs. kpi.js).
- Format der dynamischen Kachel-Titel-Strings.
- Ob der Filter-Zustand später doch in den Store wandert (wenn app-weit gewünscht).
- SW-Cache-Bump bei Umsetzung (v12 → v13).
