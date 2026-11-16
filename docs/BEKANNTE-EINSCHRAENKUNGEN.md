# v1-Abnahme — Historie

> **Rolle dieser Datei:** Abnahme-Protokoll von v1. Hält den damals **kritischen, inzwischen
> behobenen** Punkt mit Nachweis fest (Commit + Tests). Kein lebendes Backlog.
>
> **Offene Punkte stehen heute woanders:** laufende Arbeitspakete in
> [`BACKLOG.md`](BACKLOG.md), bewusst vertagte Feintuning-Reste + Technik-Merkposten in
> [`ENTWICKLER-NOTIZEN.md`](ENTWICKLER-NOTIZEN.md). Produkt-/Statusüberblick: [`../README.md`](../README.md).

## Behobener kritischer Punkt

- **Welt-Trennung Test/Produktiv — BEHOBEN.** Test- und Produktivdaten liegen
  in physisch getrennten IndexedDB-Datenbanken: `db.js dbName(welt)` liefert
  für die Test-Welt den eigenen Namen `tracking-app-test`, sonst den Standard
  `tracking-app`. Zusätzlich blockiert `backup.js pruefeImport` einen Import aus
  einer fremden Welt hart (`welt_mismatch`), und `wendeImportAn` behält immer die
  Welt des Bestands bei. Es gibt damit keinen Pfad, über den Test-Daten in die
  Produktiv-DB gelangen. Abgedeckt durch Tests in `tests/db.test.js` und
  `tests/backup.test.js`. (Commit 91d3c04)

## Nachtrag zu den früheren „offenen Punkten"

Die drei bei der v1-Abnahme hier notierten offenen Punkte sind seither aufgelöst oder umgezogen:

1. **Service-Worker unter `/test/` ohne Offline-Cache** — weiterhin bewusst akzeptiert; dokumentiert
   als Technik-Merkposten in `ENTWICKLER-NOTIZEN.md` (SW registriert nur unter `/`, nicht `/test/`).
2. **Charts: Trendlinie/Balken vereinfacht** — ✅ erledigt. Die Charts wurden 2026-10-16 neu gebaut
   (uPlot); die Trendlinie ist jetzt eine echte lineare Regression (`lineareTrend` in `calc.js`,
   getestet in `tests/calc.test.js`). Die alte „vereinfachte Linie / Ereignis-Balken" existiert
   nicht mehr.
3. **Import-Erfolgsmeldung verschwindet durch Re-Render** — weiterhin offen (kosmetisch); geführt als
   vertagter Feintuning-Rest in `ENTWICKLER-NOTIZEN.md` (zusammen mit dem analogen Profil-Statusmeldung-
   Punkt, zu lösen beim Backup-Detailtest).
