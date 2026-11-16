# Medikament-Chips im Verlauf bearbeiten & löschen

> Design-Spec, 2026-11-16. Setzt **Backlog Phase E / Commit 5** um (`docs/BACKLOG.md`):
> Medikamenten-Chips im Verlauf bearbeitbar machen. Gespiegelt am bereits umgesetzten
> Ereignis-Bearbeiten (`2026-10-16-ereignis-bearbeiten-loeschen-design.md`).
> Kein Mockup (Dialog-Muster existiert bereits im Verlauf).

## Problem

Eine Spritze (Medikament) ist im Tageseintrag eingebettet:
`tageseintraege[datum].spritze = { praeparat, dosis_mg, pen_anwendung, historie_rohtext }`
(Schema `istGueltigeSpritze`). Im Verlauf wird sie als grauer Chip `chip med` angezeigt
(`verlauf.js:80`, Text via `medText()`).

Bisher lässt sich eine gespeicherte Spritze **nur über den Eingabe-Screen** am betreffenden
Tag ändern; im Verlauf ist der Chip rein informativ. Der direkt danebenstehende
**Ereignis-Chip ist dagegen schon klickbar** (öffnet ein Bearbeiten/Löschen-Overlay). Ziel:
dieselbe Direktbearbeitung für Medikamente, konsistent zum Ereignis-Chip.

## Entscheidung

**Strukturierte Medikament-Chips werden klickbar.** Ein einfacher Klick (wie beim
Ereignis-Chip) öffnet ein Overlay zum Bearbeiten (Präparat / Dosis / Anwendung Nr.) **und**
Löschen genau dieser einen Spritze. Keine Änderung am Eingabe-Screen.

Begründung (gegen Alternative „nur im Eingabe-Screen"): Der Verlauf zeigt den Chip ohnehin an
jedem Spritzentag; ein Klick dort ist der direkte Weg. Das Dialog- und das reine-Funktionen-
Muster existieren bereits (Ereignis-Bearbeiten) und werden 1:1 gespiegelt.

### Abgrenzung: nur strukturierte Spritzen

Rohtext-Altdaten aus dem Excel-Import (nur `historie_rohtext`, **kein** `dosis_mg`, z. B.
„OZ 10/2") sind **nicht** bearbeitbar. Ihre Dosis ist bewusst nicht interpretierbar (siehe
README, Spritzen-Historie-Import) und ließe sich nicht sinnvoll in den Dosis-Stepper zwängen.
Solche Chips bleiben rein informativ (nicht klickbar).

Kriterium „strukturiert" = `spritze.dosis_mg != null` (dieselbe Bedingung, die `medText()`
schon für die Anzeige „Präparat X mg" vs. Rohtext nutzt).

## Verhalten

### Chip-Klick
- Jeder **strukturierte** Medikament-Chip trägt `data-med="<ISO-Datum>"`, `role="button"`,
  `tabindex="0"`, `title="Medikament bearbeiten"`. Klick (und Enter/Space) → Overlay für die
  Spritze **dieses Tages**.
- **Rohtext-Chips** (kein `dosis_mg`) tragen diese Attribute NICHT → nicht fokussierbar, nicht
  klickbar.
- Klick stoppt die Propagation (`stopPropagation`), damit nicht gleichzeitig der Zeilen-Klick
  „→ Eingabe-Screen" feuert (identisch zum Ereignis-Chip, `verlauf.js:275-282`).
- Pro Tag gibt es höchstens **eine** Spritze (im Tageseintrag eingebettet) → kein Mehrdeutigkeits-
  fall wie bei überlappenden Ereignissen.

### Overlay „Medikament bearbeiten"
Aufbau analog zum Ereignis-Overlay (`#v-ev-dialog`), mit den Spritzen-Feldern aus dem
Eingabe-Screen (`eingabe.js`):
- **Präparat**: Segmented-Control MJ / OZ / WG (`PRAEPARATE`), aktiv = blau.
- **Dosis**: −/+ Stepper über `DOSIS_LISTE[praep]` (MJ 2.5–15, OZ 0.25–2, WG 0.25–2.4),
  Anzeige in mg. Bei Präparatwechsel wird der Dosis-Index wie im Eingabe-Screen geklemmt.
- **Anwendung Nr.**: −/+ Stepper (ganzzahlig, min 1).
- **Speichern** (hellblau) + **Löschen** (Weg zur roten Bestätigung).
- **Abbrechen** schließt ohne Änderung.

Vorbelegung beim Öffnen aus der gespeicherten Spritze:
`praep = spritze.praeparat`, `dosisIdx = dosisIndex(DOSIS_LISTE[praep], spritze.dosis_mg)`,
`pen = spritze.pen_anwendung` (Fallback 1). (Dieselben Helfer wie `eingabe.js`.)

### Löschen (rote Bestätigung)
Eigenes Overlay analog `#v-ev-del-dialog`:
- Text: „**<Präparat> <Dosis> mg** (<Datum>) wird vom Tag entfernt. Der Tageseintrag/das
  Gewicht bleibt erhalten."
- Bestätigen → Spritze wird aus dem Tageseintrag entfernt (`spritze: null`), Gewicht & restliche
  Tagesdaten unverändert.

### Undo/Redo
Bearbeiten und Löschen laufen über `store.aktualisiere(...)` mit dem Default `{undobar:true}` →
app-weit undobar (wie beim Ereignis). Kein `{undobar:false}`.

## Datenmodell / reine Funktionen

Die Spritze ist in `tageseintraege[datum]` eingebettet (nicht in einem eigenen Array wie
Ereignisse). Die neuen reinen Funktionen operieren daher auf der `tageseintraege`-Map mit
Datums-Key. **Ort:** neues Modul `app/js/spritze.js` (parallel zu `ereignisse.js`), damit die
Spritzen-Logik an einer Stelle liegt und isoliert testbar ist.

```
// app/js/spritze.js  (reine, immutable Funktionen)

istStrukturierteSpritze(spritze) → boolean
  // true, wenn spritze vorhanden UND dosis_mg != null (→ bearbeitbar). Rohtext/null → false.

setzeSpritze(tageseintraege, datum, spritze) → neue tageseintraege-Map
  // Ersetzt die Spritze des bestehenden Tageseintrags an `datum` (immutabel, neues Objekt).
  // Lässt gewicht_kg und übrige Felder unberührt. Existiert der Tag nicht → unveränderte
  //  (neue) Map (Spritze ohne Gewicht wäre ein ungültiger Tageseintrag; wir legen keinen an).

entferneSpritze(tageseintraege, datum) → neue tageseintraege-Map
  // Setzt spritze des Tages auf null (immutabel). Unbekannter Tag → unveränderte (neue) Map.
```

Werte-Normalisierung (Präparat/Dosis/Pen) passiert im Dialog vor dem Aufruf, analog
`baueSpritze()` in `eingabe.js`: `{ praeparat, dosis_mg: DOSIS_LISTE[praep][idx],
pen_anwendung: int|null, historie_rohtext: null }`. `setzeSpritze` schreibt dieses Objekt
unverändert. (Beim Bearbeiten eines strukturierten Chips wird `historie_rohtext` auf `null`
gesetzt — es war ohnehin leer.)

## UI / CSS

- **Klickbarer (strukturierter) Medikament-Chip:** bekommt eine **graue Umrandung** als
  Interaktions-Signal — analog zur blauen Umrandung des Ereignis-Chips (Phase C), aber in Grau,
  damit die Phase-C-Unterscheidung Ereignis (blau) ≠ Medikament (grau) erhalten bleibt.
- **Rohtext-Medikament-Chip (nicht klickbar):** bleibt wie bisher **grau gefüllt ohne
  Umrandung**. Der fehlende Rand signalisiert zugleich „nicht bearbeitbar".

Damit ergibt sich eine konsistente visuelle Logik: **Rand = klickbar.**
- Ereignis → blauer Rand
- Medikament strukturiert → grauer Rand
- Medikament Rohtext → kein Rand (grau gefüllt)

Dezenter Press/Hover-Effekt wie beim Ereignis-Chip. **CSS-Spezifitätsfalle beachten**
(`#screen button…`, siehe ENTWICKLER-NOTIZEN) — hier Chips, keine Buttons, aber die Dialog-
Buttons (Speichern hellblau, Löschen rot) brauchen die bekannte Spezifität
`#screen .dialog … button.<klasse>`.

## Verlauf-Re-Render beachten

`renderVerlauf` baut seit Phase D über eine innere `baue()`-Funktion und re-rendert bei
Jahr-Klick. Die neuen Chip-Events (Klick/Keydown) müssen – wie die Ereignis-Chip-Events – **pro
`baue()`** verdrahtet werden, sonst sind sie nach einem Jahr-Wechsel tot. Die Dialoge selbst
werden wie die Ereignis-Dialoge einmal pro Render aufgebaut.

## Tests

Reine Funktionen per `node:test` (neues `tests/spritze.test.js`):
- **`istStrukturierteSpritze`**: strukturierte Spritze → true; Rohtext (nur `historie_rohtext`,
  `dosis_mg` null/undefined) → false; `null`/`undefined` → false.
- **`setzeSpritze`**: ersetzt die Spritze eines bestehenden Tages, lässt `gewicht_kg` unberührt;
  andere Tage unverändert; nicht existierender Tag → unveränderte (neue) Map; Immutabilität
  (altes Objekt unverändert).
- **`entferneSpritze`**: setzt `spritze` auf null, `gewicht_kg` bleibt; unbekannter Tag →
  unverändert; Immutabilität.

Der Dialog/die DOM-Verdrahtung in `verlauf.js` wird **nicht** unit-getestet (Projekt testet
keinen DOM) → Browser-Verifikation.

## Verifikation

- **Browser (Claude, Playwright):** über `http://localhost:8000/test/` (Cache-Falle beachten —
  CDP clearBrowserCache + setCacheDisabled + reload ignoreCache). Prüfen: strukturierter Chip
  öffnet Dialog mit korrekt vorbelegten Werten; Speichern ändert den Verlauf-Chip; Löschen
  entfernt die Spritze (Gewicht bleibt); Undo/Redo; Rohtext-Chip ist NICHT klickbar; grauer Rand
  nur am klickbaren Chip; hell + dunkel; Button-Farben (Speichern hellblau, Löschen rot).
- **Gerät (Nutzer):** Abnahme der Touch-Bedienung (Chip-Trefferfläche, Dialog).

## Deploy

Nach Abschluss Version an **beiden** Stellen hochzählen (v71 → v72): `app/js/version.js` UND
`BUILD` in `app/sw.js`. Push macht der Nutzer via GitHub Desktop; **git-Operationen macht
ausschließlich der Nutzer** (Commits + Push).

## Nicht in diesem Commit

- Rohtext-Altdaten bearbeitbar machen (bewusst ausgeschlossen).
- Hinzufügen einer Spritze an einem Tag, der noch keine hat (das bleibt der Eingabe-Screen;
  der Verlauf bearbeitet nur vorhandene).
- Änderungen am Eingabe-Screen.
