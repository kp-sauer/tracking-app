# Design: Zwei-Geräte-Pflege via Dropbox-Backup — konflikt-bewusster Merge

> **Status:** Design abgenommen (2026-11-18), noch NICHT umgesetzt. Nächster Schritt: Implementierungsplan.
> **Backlog:** Arbeitspaket-Block in [`../BACKLOG.md`](../BACKLOG.md). **Ausgangsidee & verworfene Alternativen** dort.

## Ziel & Kontext

Daten auf **zwei Geräten** pflegen: ~90 % **Android** (Hauptgerät), gelegentlich **iPhone** (Geschäftstelefon)
auf Reisen. Das weicht die Architektur-Entscheidung „ein Hauptgerät, kein Sync" (README) bewusst auf —
als **dateibasierter Pseudo-Sync**, manuell ausgelöst.

**Transport = kein neuer Code.** Die bereits auf beiden Geräten installierte **Dropbox-App** synct die
Backup-Datei; WeightLog nutzt den bestehenden JSON-Export (native Teilen-Funktion) und -Import. **Kein
Token, kein Secret in der App, kein Dropbox-API-Zugriff.** (Git/GitHub-API als Transport wurde verworfen —
Begründung im Backlog.)

Der Kern dieses Pakets ist ein **robusterer, konflikt-bewusster Import**: Merge darf **nie ungefragt einen
abweichenden Tag überschreiben**, und nach dem Import sieht der Nutzer **was passiert ist**.

## Alltags-Workflow (Zielbild)

1. **Android:** Profil → Backup → **Export** → native Teilen-Funktion → Dropbox-Ordner.
2. **iPhone:** Profil → Backup → **Import** → Datei aus Dropbox → **Zusammenführen** (empfohlen, vorausgewählt)
   → bei Tages-Kollisionen Sammel-Dialog → Ergebnis-Dialog. Dort weiterpflegen.
3. **Zurück nach Android** analog (Export iPhone → Import/Merge Android).

## Entscheidungen (Brainstorming 2026-11-18)

| Thema | Entscheidung |
|---|---|
| Transport | Geteilter **Dropbox-Ordner**, bestehender JSON-Export/-Import. Kein Sync-Code, kein Secret. |
| Doppel-Konflikt (gleicher Tag, anderer Wert) | **App fragt** (kein stilles Überschreiben, kein auto „neuerer gewinnt"). |
| Kollisions-Umfang | **Nur Tageseinträge, inhaltlich verschieden.** Ereignisse mergen still per `id`; Profil nur bei leerem lokalen Profil aus Datei. |
| Dialog-Form | **Sammel-Dialog, Entscheidung für alle** (zwei Knöpfe, keine Pro-Tag-Auswahl). |
| Import-Default | **Weiter fragen (Modus-Dialog), Merge empfohlen/vorausgewählt.** „Ersetzen" bleibt mit Warnung. |
| Ergebnis-Feedback | **Ergebnis-Dialog, bleibt stehen** (umgeht den bekannten Re-Render-Bug flüchtiger Pillen). |
| Code-Struktur | **Reine Funktionen in `backup.js`** (unit-getestet) + **UI in `screens/profil.js`**. |
| Datenmodell | **Unverändert** — kein `erfasst_am`-Zeitstempel (Doppel-Änderungen selten). |

## Ist-Zustand (gesichtet)

- **`app/js/backup.js`:** `baueExport` · `pruefeImport(datei, welt)` (harte Welt-Prüfung, bleibt) ·
  `wendeImportAn(bestand, datei, modus)` mit `'ersetzen'` | `'merge'`.
  **Heutige Merge-Semantik:** Tage `{...bestand, ...datei}`, Ereignisse per `id` → **bei Kollision gewinnt
  die Datei** (= die zu ersetzende Schwachstelle).
- **UI liegt in `app/js/screens/profil.js`** (NICHT `app/js/profil.js` — alte Doku-Referenz war ungenau).
  Import heute: verstecktes File-Input → `JSON.parse` → `pruefeImport` → **natives `confirm()`**
  („OK = Ersetzen, Abbrechen = Merge", Z. 287) → `wendeImportAn` → `leereHistorie()` → flüchtige Status-Pille.
  Das native `confirm()` widerspricht der Projekt-Regel „keine nativen confirm-Dialoge" (bei Verlauf-Löschen
  bereits entfernt) und wird hier durch ein Overlay ersetzt.

## Komponenten

### Reine Logik (`backup.js`, voll unit-getestet)

**`analysiereImport(bestand, datei) → { neu, identisch, konflikte }`**
- `neu`: `[datum, …]` — Tag nur in Datei → wird übernommen.
- `identisch`: `[datum, …]` — Tag in beiden, Tageseintrag inhaltlich GLEICH → nichts zu tun.
- `konflikte`: `[{ datum, lokal, datei }, …]` — Tag in beiden, inhaltlich VERSCHIEDEN.
- „Inhaltlich verschieden" = **tiefer Vergleich des Tageseintrags**: Gewicht ODER eingebettete Spritze
  ODER `historie_rohtext` weicht ab (nicht nur Gewicht).
- Betrachtet NUR `tageseintraege`. Ereignisse/Profil werden hier nicht als Konflikt behandelt.

**`wendeMergeAn(bestand, datei, konfliktWahl) → { bestand, zaehlung }`**
- `konfliktWahl: 'datei' | 'lokal'`.
- `'lokal'`: kollidierende Tage bleiben lokal; nur `neu`-Tage kommen dazu.
- `'datei'`: kollidierende Tage werden mit Datei-Werten überschrieben; `neu`-Tage kommen dazu.
- In beiden Fällen: **Merge entfernt nie einen lokalen Tag** (fehlende Datei-Tage bleiben erhalten).
- Ereignisse: still per `id` vereinigen (bestehendes Verhalten). Profil: Datei-Profil nur, wenn lokal keins.
- `zaehlung = { neu, aktualisiert, unveraendert }` (aktualisiert = überschriebene Konflikte bei `'datei'`, sonst 0).
- **Immutabel** (Eingaben nicht mutieren — Projekt-Konvention).

**`wendeImportAn(…, 'ersetzen')`** bleibt unverändert für den Ersetzen-Pfad.

### UI (`screens/profil.js`)

Drei Overlays im bestehenden `.dialog`-Muster (⚠️ CSS-Spezifitätsfalle `#screen button:not(...)`: eigene
Button-Regeln mit Spezifität ≥ (1,1,1) nötig, analog `.dialog.med-edit`/`.dialog.ev-edit`):

1. **Import-Modus-Dialog** (ersetzt `confirm()`): „Zusammenführen (empfohlen)" vorausgewählt · „Ersetzen"
   sekundär mit Warnhinweis „verwirft lokale Nachträge". Abbrechen möglich.
2. **Konflikt-Sammel-Dialog** (nur wenn Merge ≥ 1 Konflikt): Liste `Datum: lokal <x> → Datei <y>`; zwei
   Knöpfe **„Alle aus Datei übernehmen"** / **„Alle lokal behalten"**. Keine Pro-Tag-Auswahl.
3. **Ergebnis-Dialog** (bleibt stehen bis Wegtippen): „**X** neu · **Y** aktualisiert · **Z** unverändert".
   Auch im Ersetzen-Pfad gezeigt (konsistentes Feedback).

## Datenfluss

```
Datei wählen → JSON.parse → pruefeImport (Welt-Check, unverändert; Fehler → hart blockiert)
   → Import-Modus-Dialog
        ├─ Ersetzen → wendeImportAn('ersetzen')              → Ergebnis-Dialog
        └─ Merge   → analysiereImport
                        ├─ 0 Konflikte → wendeMergeAn(…, 'datei'*) → Ergebnis-Dialog
                        └─ ≥1 Konflikt → Konflikt-Dialog → Wahl → wendeMergeAn → Ergebnis-Dialog
   → store.aktualisiere({undobar:false}) → leereHistorie()
```
*Bei 0 Konflikten ist die Wahl bedeutungslos (es gibt nichts zu überschreiben).

## Edge Cases

- **Leerer lokaler Bestand** (frisches iPhone): alle Tage `neu`, keine Konflikte → einfacher Vollimport.
- **Datei = lokaler Stand** (versehentlicher Re-Import): alles `identisch` → „0 neu · 0 aktualisiert · N unverändert". Kein Schaden.
- **Älterer Export importiert:** neuere lokale Tage bleiben (Merge löscht nie); abweichende Tage → Konflikt-Dialog. Kein stilles Überschreiben.
- **Welt-Mismatch / kaputtes JSON / falsches Schema:** unverändert durch `pruefeImport` vor der Analyse hart blockiert.
- **Undo:** Import bleibt nicht undobar (`leereHistorie()`), unverändert.

## Tests (TDD für reine Logik)

`tests/backup.test.js` erweitern:
- `analysiereImport`: leerer Bestand · identische Tage · Gewichts-Konflikt · Spritzen-Konflikt bei gleichem Gewicht · nur neue Tage · Mischfall.
- `wendeMergeAn`: `'lokal'` behält Kollisionen + fügt neu hinzu · `'datei'` überschreibt · Zählung stimmt · Ereignisse per `id` · Profil-Regel (leer → Datei, sonst lokal) · Eingaben nicht mutiert.
- **DOM/Dialoge:** nicht unit-getestet (Projekt-Konvention) → Browser-Check `localhost:8000/test/`: Import einer manipulierten Datei mit erzwungener Kollision; Modus-/Konflikt-/Ergebnis-Dialog hell+dunkel; **Button-Farben** prüfen (Spezifitätsfalle).

## Nicht-Ziele (YAGNI)

- Kein automatischer Sync, kein Dropbox-API-Zugriff, kein Token.
- Kein `erfasst_am`-Zeitstempel / kein „neuerer gewinnt".
- Keine Pro-Tag-Konfliktauswahl.
- Keine Ereignis-/Profil-Konfliktdialoge (Ereignisse still per `id`, Profil lokal-first).

## Deploy-Hinweis

Nach Umsetzung Version an BEIDEN Stellen gleich hochzählen: `app/js/version.js` UND `BUILD` in `app/sw.js`
(sonst kein SW-Update — siehe ENTWICKLER-NOTIZEN).
