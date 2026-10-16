# Design: Test-/Produktiv-Mechanik

> **Status:** Entwurf, vom Nutzer abschnittsweise bestätigt (2026-10-14). Löst den bis dahin
> VERTAGTEN kritischen offenen Punkt aus `README.md` / Memory `tracking-app-project`.
> Nächster Schritt nach Freigabe dieser Spec: Implementierungsplan (writing-plans).

## Problem & Hintergrund

Die App soll gefahrlos mit realistischen Daten (Excel-Historie) ausprobiert werden können, ohne
dass diese Spielerei je mit den echten Produktivdaten vermischt wird. Bis zur Freigabe bleibt die
**Excel führend**; die App ist bis dahin reine Testumgebung.

**Harte Design-Anforderung:** Es darf **nie ungefragt** zwischen Test- und Produktivbestand
gewechselt oder vermischt werden. In früheren Projekten ist genau das schiefgegangen (ungefragtes
Hin- und Herspringen zwischen beiden Beständen). Diese Mechanik verhindert das an der Wurzel.

## Grundentscheidung

**Keine Umschaltung innerhalb einer App.** Stattdessen zwei physisch getrennte Welten, die man
nicht verwechseln kann — und die sich technisch nicht sehen können.

## Abschnitt 1 — Zwei getrennte Welten (zwei URLs, eine Codebasis)

> **Korrektur (2026-10-14):** Die ursprüngliche Annahme, die Trennung ergebe sich allein aus zwei
> URLs/Pfaden, ist für denselben Origin **falsch**. IndexedDB ist **origin-gebunden** (Host + Port),
> **nicht pfad-gebunden** — zwei Pfade am gleichen Origin (`.../tracking-app/` und
> `.../tracking-app/test/`) teilen sich dieselbe Datenbank. Die physische Trennung wird deshalb über
> **welt-abhängige DB-Namen** hergestellt: Produktiv nutzt `tracking-app`, Test nutzt
> `tracking-app-test`. Die Welt wird weiterhin aus dem Pfad erkannt (`world.js`), der DB-Name folgt
> dann der Welt (`db.js` → `dbName(welt)`). Die harte Import-Welt-Prüfung (fremde Welt wird blockiert,
> Abschnitt 3) bleibt als zweite, unabhängige Absicherung bestehen.

| Welt | URL (Beispiel) | IndexedDB |
|---|---|---|
| **Produktiv** | `.../tracking-app/` | DB-Name `tracking-app` |
| **Test** | `.../tracking-app/test/` | DB-Name `tracking-app-test` |

- Gemeinsame Codebasis, zwei Bereitstellungs-Pfade.
- IndexedDB ist an den **Origin** gebunden → bei getrennten Origins (z. B. unterschiedliche Hosts)
  sind die Bestände schon durch den Browser getrennt. Bei **gleichem Origin** erzwingen die
  welt-abhängigen DB-Namen (`tracking-app` vs. `tracking-app-test`) die physische Trennung — es
  *kann* nichts ungefragt zwischen den Welten springen.
- Jede Welt kennt ihre Identität über eine Konstante `WELT = "test"` bzw. `"produktiv"` (aus dem
  Pfad abgeleitet). Diese Kennung steuert visuellen Marker und Import-Prüfungen.

## Abschnitt 2 — Visueller Marker

- **Test-Welt:** dauerhafter, unübersehbarer **farbiger Balken** (z. B. kräftiges Orange/Gelb) am
  oberen Rand, auf allen Screens sichtbar, Text **„TESTMODUS"**. Optional ergänzend eine
  abweichende Akzentfarbe des Test-Themes.
- **Produktiv-Welt:** **kein** Balken — das normale Erscheinungsbild *ist* das Signal „hier ist es
  echt".
- Der Marker wird aus der `WELT`-Konstante abgeleitet, **nicht** aus gespeicherten Daten → kann
  nicht durch Import oder Datenfehler „verschwinden".

## Abschnitt 3 — Datenbefüllung: Seed vs. Restore streng getrennt

Daten kommen auf **genau zwei** Wegen von außen in eine Welt; die beiden dürfen sich nie
vermischen.

### Seed (Erstbefüllung aus Excel)
- Quelle: `seed_<welt>_<zeitstempel>.json`, erzeugt vom Konvertierungs-Skript (Abschnitt 5).
- **Nur möglich, solange die Welt leer ist.** Sobald ein Bestand existiert, ist der Seed-Weg
  **gesperrt** (gar nicht erst anklickbar).
- Pro Welt faktisch genau einmal: Test jetzt (volle Historie 2024–2026), Produktiv später beim
  Scharfschalten (dann aktueller Excel-Stand).

### Restore (Recovery aus eigenem Backup)
- Quelle: ein von der App selbst exportiertes Backup-JSON.
- **Jederzeit verfügbar**, auch (und gerade) wenn schon Daten vorhanden sind — sonst wäre Recovery
  unmöglich.
- Bei vorhandenem Bestand: **immer explizite Rückfrage** — Ersetzen oder Zusammenführen (Merge),
  nie automatisch.

### Welt-Prüfung bei jedem Import
Jede Import-Datei trägt intern eine Herkunfts-Kennung (`welt`, Zeitstempel).
- Datei **derselben** Welt → läuft durch (ggf. mit Ersetzen/Merge-Rückfrage).
- Datei einer **fremden** Welt → **hart blockiert**, mit klarer Meldung. Keine Umgehung, kein
  „trotzdem"-Button. Begründung: Es gibt keinen legitimen Anlass, ein Test-Backup in Produktiv zu
  spielen (oder umgekehrt).

## Abschnitt 4 — Backup-Export

- **Beide Welten** können jederzeit ihren eigenen Bestand als JSON exportieren (native
  Teilen-Funktion → Drive/iCloud, gemäß Architektur-Entscheidung).
- Jede Export-Datei trägt intern die **Herkunfts-Kennung**: `welt` (`"test"`/`"produktiv"`),
  Zeitstempel, ggf. Schema-Version.
- Diese Kennung ist Grundlage der harten Welt-Prüfung beim Restore (Abschnitt 3).
- Export ist in beiden Welten identisch; nur der Inhalt der Kennung unterscheidet sich.
- Backup/Recovery ist damit ein **eigenständiger Prozess**, komplett unabhängig vom einmaligen
  Seed.

## Abschnitt 5 — Excel→JSON-Konvertierungs-Skript

Ein **eigenständiges Skript** auf dem Rechner (nicht Teil der App — die App hat keinen
Excel-Parser; konsistent mit der Architektur-Entscheidung).

- **Eingabe:** `Blutwerte.xlsx` — **nur lesen, nie überschreiben** (bestehende Projektregel).
- **Ausgabe:** `seed_<welt>_<YYYY-MM-DD_HHMM>.json`, z. B. `seed_test_2026-10-14_1532.json`.
- **Welt als Parameter:** Beim Aufruf wird angegeben, ob ein Test- oder Produktiv-Seed erzeugt
  wird. Die `welt`-Kennung landet sowohl im Dateinamen als auch intern in der JSON.
- **Nie-Überschreiben-Garantie:** Der Zeitstempel im Namen macht jeden Lauf eindeutig; alte Seeds
  bleiben erhalten und werden nie automatisch überschrieben. Aufräumen erfolgt manuell.
- **Workflow Scharfschalten (später):** Excel mit neuester Version aktualisieren → Skript mit
  `welt=produktiv` ausführen → frische Produktiv-Seed-JSON → in die **leere** Produktiv-Welt
  importieren → ab da echte Eingaben.
- Das Skript spiegelt die bereits dokumentierte Fachlogik (Spritzen-Historie MJ/OZ/WG,
  Marker-Interpretation, Rundungs-/Filterregeln) — Details gehören in den Implementierungsplan,
  nicht in dieses Design.

## Konsequenzen für das übrige Projekt

- Das Datenmodell (IndexedDB) braucht **kein** separates „Testmodus-Flag" mehr im Profil — die
  Welt ergibt sich aus der URL, nicht aus gespeicherten Daten. (Abweichung vom früheren
  vorläufigen Konzeptstand; README entsprechend aktualisieren.)
- Export-/Import-Format muss die Herkunfts-Kennung (`welt`, Zeitstempel, Schema-Version) enthalten.
- Hosting muss zwei Pfade bereitstellen (Produktiv-Root + `/test/`).

## Offen für den Implementierungsplan (nicht Teil dieses Designs)

- Konkretes JSON-Schema inkl. Kennungs-Feldern.
- Genaues Verhalten der Merge-Logik beim Restore (Konfliktauflösung Datum-Kollisionen).
- Technik zur Ableitung der `WELT`-Konstante aus dem Pfad.
- Sprache/Runtime des Konvertierungs-Skripts (z. B. Node vs. Python).
