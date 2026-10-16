# Design: Anzeigegröße + Darstellung live schalten

> **Status:** Entwurf, vom Nutzer abschnittsweise bestätigt (2026-10-15). Teil des laufenden
> Design-/UX-Feintunings (siehe `FEINTUNING-FORTSCHRITT.md`). Nächster Schritt nach Freigabe
> dieser Spec: Implementierungsplan (writing-plans).

## Problem & Hintergrund

Zwei zusammenhängende Punkte aus der Nutzung:

1. **Anzeigegröße fehlt.** Der Nutzer muss im Browser dauerhaft auf 110 % zoomen, damit die App gut
   lesbar ist. Dieser Zoom soll als App-Einstellung im Profil hinterlegbar sein.
2. **Darstellung greift unnatürlich spät.** Der Theme-Schalter (Hell/Dunkel) im Profil wirkt erst
   nach „Speichern" — während der Theme-Toggle in der Kopfzeile schon sofort schaltet. Zwei Wege,
   dasselbe zu tun, mit unterschiedlichem Verhalten. Das irritiert.

## Grundentscheidungen

- **Anzeigegröße skaliert die ganze App** (Schrift, Abstände, Icons, Karten) gleichmäßig — wie der
  manuelle Browser-Zoom. Umsetzung über `document.documentElement.style.zoom`, **nicht** über eine
  Schrift-/`rem`-Umstellung (das CSS nutzt durchgängig feste `px`; ein `rem`-Umbau wäre ein großer,
  fehleranfälliger Eingriff in jede Style-Zeile). `zoom` wirkt eine Ebene darüber und ignoriert die
  px-vs-rem-Frage komplett.
- **Darstellung (Theme + Anzeigegröße) wirkt sofort live UND speichert sofort** — identisch zum
  bestehenden Kopf-Theme-Toggle (`store.aktualisiere`). Kein „Speichern"-Schritt mehr für
  Darstellung.
- **Speichern-Button bleibt, aber nur für Stammdaten.** Da Darstellung nun auto-speichert, hat der
  Button keinen Einfluss mehr auf Theme/Größe. Er rückt direkt unter die Stammdaten-Karte und
  beschriftet sich sinngemäß „Stammdaten speichern". (Entscheidung A gegen das vollständige
  Auto-Speichern aller Felder B — B hätte robustes `blur`/Validierungs-Handling der Zahlenfelder
  Körpergröße erzwungen; deutlich mehr Aufwand und Risiko bei ungültigen Zwischenwerten, ohne das
  eigentliche Feature zu verbessern. A bildet die iOS-Logik korrekt ab: Schalter sofort, Eingabe-
  felder bewusst per Button.)

## Abschnitt 1 — Datenmodell (additiv)

- Neues optionales Feld **`profil.anzeige_skala`** (Zahl, Prozent als Ganzzahl, z. B. `110`).
- Fehlt es oder ist es ungültig → effektiv **`100`** (Standard, kein Zoom).
- Additiv wie gehabt: bricht `pruefeImport` nicht, wird von `baueExport` normal mitgeführt (Teil des
  `profil`-Objekts, kein Sonderfall wie `letztes_backup`).

## Abschnitt 2 — Erlaubte Stufen & reine Logik (TDD)

- **Fünf Stufen:** `90 · 100 · 110 · 120 · 130` (%). Standard `100`.
- Neue reine, testbare Funktion **`effektiveSkala(wert)`** (analog zu `effektivesTheme` in
  `theme.js`):
  - fehlend / `undefined` / `null` → `100`
  - `NaN` / nicht-Zahl → `100`
  - Wert außerhalb/zwischen den Stufen → **nächstgelegene erlaubte Stufe** (robust gegen krumme
    Importwerte); Werte ≤ 90 → `90`, ≥ 130 → `130`.
  - exakte Stufe → unverändert.
- Platzierung: entweder in `theme.js` ergänzen (passt thematisch: „Darstellung") oder eigene kleine
  `anzeige.js`. **Entscheidung für den Plan**, nicht blockierend fürs Design.

## Abschnitt 3 — Anwendung im App-Gerüst

- Neue Funktion **`skalaAnwenden()`** in `main.js`, analog zu `themeAnwenden()`:
  - liest `store.get().profil?.anzeige_skala`, normalisiert via `effektiveSkala`,
  - setzt `document.documentElement.style.zoom = skala / 100`.
- Aufruf in `render()` direkt neben `themeAnwenden()` → wirkt bei jedem Re-Render (also auch sofort
  nach einer Store-Änderung durch den Schalter).

## Abschnitt 4 — Profil-UI „Darstellung"

Bereich „Darstellung" bekommt eine zweite Zeile. Beide Zeilen sind Segmented-Controls (`.seg`):

| Zeile | Control | Werte |
|---|---|---|
| Design | Segmented | System · Hell · Dunkel |
| **Anzeigegröße** | Segmented, A-Größen | fünf „A" in 11/13/15/18/22 px → 90/100/110/120/130 % |

- **Variante D** (vom Nutzer gewählt, Mockup `mockups/05-anzeigegroesse.html`): fünf unterschiedlich
  große „A", visuell selbsterklärend (iOS-Mail-Stil), aktive Stufe blau gefüllt.
- **Beide Zeilen auto-live:** Klick → `store.aktualisiere(d => ({...d, profil: {...d.profil, …}}))`.
  Der Store-Re-Render wendet Theme bzw. Skala sofort an. Kein Speichern-Button-Umweg mehr.
- Das löst nebenbei die bekannte Theme-Statusmeldungs-Macke für die Darstellung (kein manuelles
  Speichern → keine durch Re-Render verschwindende Statusmeldung an dieser Stelle).

## Abschnitt 5 — Speichern-Button & Stammdaten

- Der bestehende `#pr-speichern`-Button **rückt** aus dem Seitenende **direkt unter die
  Stammdaten-Karte**.
- Beschriftung sinngemäß **„Stammdaten speichern"** (statt „Speichern").
- Speichert nur noch `koerpergroesse_m`, `geschlecht`, `geburtsdatum`. Theme und `anzeige_skala`
  sind da bereits persistiert und werden vom Button **nicht** angefasst (bzw. unverändert
  durchgereicht, damit kein Feld verloren geht).
- Die Stammdaten-Felder selbst bleiben unverändert (Eingabe + Speichern per Button, kein `blur`-
  Auto-Save) — bewusste Abgrenzung zur verworfenen Variante B.

## Tests

- **`effektiveSkala`** (reine Funktion, `node:test` wie `theme.test.js`): fehlend → 100, `NaN`/
  Quatsch → 100, exakte Stufe → unverändert, krummer Wert → nächste Stufe, Extremwerte → geklemmt
  auf 90 bzw. 130.
- Die `zoom`-Anwendung (DOM-Seiteneffekt in `main.js`) bleibt wie `themeAnwenden` **ungetestet**
  (nicht sinnvoll unit-testbar) — Verifikation stattdessen im Browser.

## Browser-Verifikation (nach Umsetzung)

Über die laufende Produktiv-Welt bzw. Testumgebung (gemäß Projektregel). Zu prüfen:
- Anzeigegröße-Schalter skaliert die ganze App sofort, Stufe bleibt nach Reload erhalten.
- Theme-Schalter im Profil wirkt jetzt sofort (nicht erst nach Speichern).
- Stammdaten-Button speichert weiterhin Körpergröße/Geschlecht/Geburtsdatum korrekt.
- `anzeige_skala` übersteht Export→Import.

## Offen für den Implementierungsplan (nicht Teil dieses Designs)

- Platzierung von `effektiveSkala` (`theme.js` erweitern vs. neue `anzeige.js`).
- Exakte Pixelgrößen der fünf „A" im Schalter (Feinschliff am Mockup).
- Ob `skalaAnwenden` und `themeAnwenden` zu einer `darstellungAnwenden()` zusammengefasst werden.
- SW-Cache-Name hochzählen (`v11` → `v12`) wegen CSS/JS-Änderung.
