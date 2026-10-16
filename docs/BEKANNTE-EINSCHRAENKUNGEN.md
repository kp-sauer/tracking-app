# Bekannte Einschränkungen (v1)

Dieses Dokument sammelt bewusst ins Feintuning verschobene Punkte. Keiner davon
ist ein Blocker für die v1-Abnahme. Es dient als Backlog für die nächste Runde.

## Behobener kritischer Punkt (zur Nachverfolgung)

- **Welt-Trennung Test/Produktiv — BEHOBEN.** Test- und Produktivdaten liegen
  jetzt in physisch getrennten IndexedDB-Datenbanken: `db.js dbName(welt)` liefert
  für die Test-Welt den eigenen Namen `tracking-app-test`, sonst den Standard
  `tracking-app`. Zusätzlich blockiert `backup.js pruefeImport` einen Import aus
  einer fremden Welt hart (`welt_mismatch`), und `wendeImportAn` behält immer die
  Welt des Bestands bei. Es gibt damit keinen Pfad, über den Test-Daten in die
  Produktiv-DB gelangen. Abgedeckt durch Tests in `tests/db.test.js` und
  `tests/backup.test.js`. (Commit 91d3c04)

## Offene Punkte fürs Feintuning

1. **Service-Worker unter `/test/` ohne Offline-Cache.** Die SW-Registrierung
   schlägt unter `/test/` fehl (404 auf `/test/sw.js`) und wird in `main.js` per
   `.catch()` still abgefangen. Folge: Die Test-Welt läuft ohne Offline-Cache.
   Für die Produktiv-Welt funktioniert der Service Worker. Bewusst akzeptiert.

2. **Charts: Trendlinie/Balken vereinfacht.** Die Trendlinie und die
   Ereignis-Balken in `screens/charts.js` sind derzeit vereinfachte Linien.
   Feintuning (echte Balken/geglättete Trendlinie) ist verschoben.

3. **Import-Erfolgsmeldung verschwindet durch Re-Render.** Nach erfolgreichem
   Import wird der Status „Import erfolgreich" gesetzt, aber das durch
   `store.aktualisiere` ausgelöste Re-Render des Profil-Screens überschreibt die
   Meldung sofort. Der Import selbst wird korrekt angewendet; nur die Bestätigung
   ist flüchtig. Kosmetisch, verschoben.
