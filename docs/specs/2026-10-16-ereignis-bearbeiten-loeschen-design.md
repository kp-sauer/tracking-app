# Ereignisse im Verlauf bearbeiten & löschen

> Design-Spec, 2026-10-16. Schließt den bekannten offenen Punkt „Ereignisse einzeln
> löschen" (siehe `docs/FEINTUNING-FORTSCHRITT.md`, Offener Rest #4). Mockup:
> `mockups/10-ereignis-bearbeiten.html`.

## Problem

Ereignisse (`{id, von, bis, kategorie, freitext}`) sind ein eigener Datentyp, getrennt
von den Tageseinträgen. Ein mehrtägiges Ereignis ist **ein** Datensatz; die Tage dazwischen
gehören nur rechnerisch dazu (über den Von–Bis-Bereich). Bisher:

- **Bearbeiten** geht nur über den **Starttag** im Eingabe-Screen (`von === datum`).
- **Löschen** gibt es gar nicht in der App — der ✕ im Verlauf löscht nur den Tageseintrag,
  Ereignisse bleiben bewusst erhalten (`verlauf.js:131`). Bereinigung bisher nur per Browser-Console.

Ziel: Ereignisse (auch mehrtägige) von **jedem** Tag im Zeitraum aus bearbeiten **und** löschen,
ohne die bestehende „nur Starttag"-Regel im Eingabe-Screen anzutasten.

## Entscheidung

**Ereignis-Chips im Verlauf werden klickbar.** Ein Klick auf einen Ereignis-Chip öffnet ein
Overlay zum Bearbeiten/Löschen genau dieses einen Ereignisses. Keine Änderung am Eingabe-Screen.

Begründung (gegen die Alternative „Eingabe an jedem Tag editierbar"): Der Verlauf zeigt den
Ereignis-Chip bereits an jedem Tag im Zeitraum (`ereignisseAmTag`); klickbare Chips erreichen
dasselbe Ereignis von überall, ohne die strenge Ein-Tag-ein-Formular-Logik und den gerade
gefixten Dubletten-Schutz des Eingabe-Screens aufzuweichen.

## Verhalten

### Chip-Klick
- Jeder Ereignis-Chip trägt die `ev.id` (`data-ev`). Klick → Overlay für **genau dieses** Ereignis.
- Bei **überlappenden** Ereignissen am selben Tag (z. B. Urlaub 15.–22. + Krankheit am 16.) zeigt
  der Verlauf wie bisher **zwei getrennte Chips**; jeder öffnet sein eigenes Ereignis.
- Klick auf den Chip stoppt die Propagation (`stopPropagation`), damit nicht gleichzeitig der
  Zeilen-Klick „→ Eingabe-Screen" feuert.
- Chips bleiben optisch unverändert (keine Edit-Markierung); nur dezenter Hover/Press-Effekt.

### Overlay „Ereignis bearbeiten"
Nutzt die bestehende `.dialog`-Overlay-Mechanik (wie Lösch-Dialog), aber breiter (`max-width:340px`)
und links-bündiges Formular:
- **Kategorie:** Segmented-Control über `EINGABE_KATEGORIEN` (Urlaub · Fest · Krankheit · Wiesn · Sonst),
  aktive Kategorie blau. Alt-Kategorie `sport` (nicht im UI-Set): kein Segment aktiv, Nutzer muss
  bewusst neu wählen — konsistent mit dem Eingabe-Screen.
- **Von / Bis:** je ein `datumsPicker` (Rädchen Tag/Monat/Jahr → ISO), vorbelegt mit `ev.von`/`ev.bis`
  via `setWert`. Erscheinen als **blaue Pille** (konsistent mit Eingabe/Profil; bewusst nicht Mockup-Grau).
- **Notiz:** Textfeld, vorbelegt mit `ev.freitext`.
- **Buttons:** `Abbrechen` (neutral) + `Speichern` (blau, Haupt-Aktion).
- **Löschen:** dezente **rote Textzeile unter** den Buttons (`.loeschen-zeile`), nicht gleichwertiger
  dritter Button — verhindert versehentliches Löschen, hält Speichern als Haupt-Aktion.

### Speichern
Ersetzt Kategorie, Von, Bis, Notiz des Ereignisses (identifiziert über `id`), erzeugt ein neues
Ereignisse-Array (immutabel). Validierung: Bis darf nicht vor Von liegen → falls doch, werden Von/Bis
getauscht (defensiv; der Rädchen-Picker lässt beliebige Daten zu). **Undobar** (Default-Store-Verhalten).

### Löschen
Rote Textzeile → eigenes rotes Bestätigungs-Overlay (`.dialog.schmal` + `.gefahr`-Button, wie der
Tageseintrag-Lösch-Dialog) mit Zusammenfassung „<Kategorie> (<Von>–<Bis>) wird dauerhaft entfernt."
Bestätigen → Ereignis per `id` aus dem Array entfernt. **Undobar.**

Beide Aktionen laufen über `ctx.store.aktualisiere(fn)` mit Default `{undobar:true}` → Undo/Redo-Pfeile
im Verlauf-Kopf werden aktiv, mehrstufig, session-only (identisch zum Tageseintrag-Löschen).

## Reine Funktionen (neu in `ereignisse.js`, testbar)

```js
// Ersetzt Felder eines Ereignisses per id, gibt NEUES Array zurück.
aktualisiereEreignis(ereignisse, id, { kategorie, von, bis, freitext }) -> Ereignis[]

// Entfernt Ereignis per id, gibt NEUES Array zurück.
entferneEreignis(ereignisse, id) -> Ereignis[]
```

Beide immutabel (keine Mutation des Eingabe-Arrays), analog zu `setzeTagesereignis`/`entferneTageseintrag`.
Von/Bis-Tausch bei verkehrter Reihenfolge sitzt in `aktualisiereEreignis` (eine Stelle, getestet).

## UI-Baustein (neu in `verlauf.js`)

Das Ereignis-Overlay und seine Verdrahtung leben in `verlauf.js` (wächst dadurch moderat; bleibt ein
Screen, ein Zweck). Falls `verlauf.js` zu groß wird, kann das Overlay später in ein eigenes Modul
(`js/screens/ereignis-dialog.js`) ausgelagert werden — für v1 dieser Änderung nicht nötig (YAGNI).

Styles: neue Klassen `.loeschen-zeile`, Wiederverwendung von `.dialog`, `.seg`, `.gefahr`,
`.datum-pille`-Äquivalent (datumsPicker bringt eigene Styles mit). Alles über die bestehenden
Farb-Tokens; Dark-Mode automatisch.

## Nicht im Scope (YAGNI)
- Keine Änderung am Eingabe-Screen (neues Ereignis weiterhin nur am Starttag anlegen).
- Keine Liste-aller-Ereignisse-Ansicht; Overlap wird über die bestehenden mehreren Chips gelöst.
- Keine neue „Ereignisse"-Übersicht; der Verlauf bleibt der einzige Ort.

## Tests
- `ereignisse.test.js`: `aktualisiereEreignis` (Feld-Ersatz, immutabel, Von/Bis-Tausch, id nicht
  gefunden = unverändert), `entferneEreignis` (Entfernen, id nicht gefunden, immutabel).
- Browser-Verifikation über `http://localhost:8000/test/`: Chip-Klick öffnet Overlay, Bearbeiten +
  Speichern wirkt, Löschen mit roter Bestätigung, Undo/Redo mehrstufig, Overlap (zwei Chips → je eigenes
  Ereignis), hell + dunkel, Lösch-Button wirklich ROT (CSS-Spezifitätsfalle `#screen button` beachten,
  siehe Technik-Merkposten).
