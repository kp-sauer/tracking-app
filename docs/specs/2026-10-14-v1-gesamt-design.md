# Design: tracking-app v1 — Gesamt-Spec

> **Status:** Entwurf, 2026-10-14. Das „Dach" über der gesamten v1. Verdichtet das Konzept aus
> `README.md` zu einer implementierungsreifen Spec und legt das **Datenmodell-Schema** als
> Herzstück final fest. Die Test-/Produktiv-Mechanik wird hier **referenziert, nicht wiederholt**:
> siehe [`2026-10-14-test-produktiv-mechanik-design.md`](2026-10-14-test-produktiv-mechanik-design.md).
>
> **Zweck:** gemeinsame Quelle der Wahrheit, auf die sich alle Teil-Implementierungspläne stützen,
> damit die Stücke nahtlos zusammenpassen. Nächster Schritt nach Freigabe: Teilpläne der Reihe nach
> (writing-plans), beginnend mit dem Fundament.

## 1. Überblick

Eine **offline-first PWA** zum täglichen Gewichts-/Gesundheits-Tracking. Läuft im Browser auf
Android und iPhone ohne App-Store (optional „Zum Startbildschirm hinzufügen"), funktioniert offline.
Vanilla JS, kein Build-Step, leichte Chart-Lib, Static-Hosting (z. B. GitHub Pages). Daten lokal in
IndexedDB; Gerät = Source of Truth; Backup/Restore per JSON-Datei.

Generische Einzelperson-App: **1 Profil pro Gerät/Browser**, kein Login. Erststart = Onboarding.

## 2. Datenmodell (Herzstück)

Drei getrennte Bereiche in IndexedDB. Berechnete Werte werden **nie gespeichert**, sondern bei
Anzeige aus den Rohdaten abgeleitet (siehe §4).

### 2.1 Profil (ein Objekt pro Welt)
```
profil: {
  koerpergroesse_m: number,            // Meter, z. B. 1.75 (Default-Vorschlag im Onboarding); geht in BMI
  geschlecht: "m" | "w" | "divers",
  geburtsdatum: "YYYY-MM-DD",          // ISO; Alter wird tagesaktuell berechnet
  theme: "hell" | "dunkel" | "system"  // Default "system"
}
```
- **Kein** Testmodus-Flag — die Welt ergibt sich aus der URL (Mechanik-Spec), nicht aus Daten.
- Geschlecht + Alter dienen nur Analysen/Einordnungen, fließen **nicht** in BMI o. Ä. ein.

### 2.2 Tageseinträge (Datum = Key)
```
tageseintraege: {
  "YYYY-MM-DD": {                      // ISO-Datums-String als Primärschlüssel
    gewicht_kg: number,
    spritze: {                         // optional, nur an Injektionstagen; sonst Feld fehlt/null
      praeparat: "MJ" | "OZ" | "WG",
      dosis_mg: number | null,         // Neueingabe & MJ-Import gesetzt; null wenn unbekannt
      pen_anwendung: number | null,    // laufende Pen-Anwendungs-Nr. X; nur bei Neueingabe
      historie_rohtext: string | null  // z. B. "OZ 10/2" bei unrekonstruierbarem Import; sonst null
    } | null
  },
  ...
}
```
- **ISO-String `"YYYY-MM-DD"`** als Key: sortiert chronologisch als Text, zeitzonen-sicher
  (reines Kalenderdatum), im Export lesbar.
- Nur **Datum (Key) + `gewicht_kg`** sind Pflicht-Eingaben; alles andere optional/abgeleitet.
- **Spritze – ein Objekt, zwei Fälle:** Neueingabe füllt `dosis_mg` + `pen_anwendung`,
  `historie_rohtext` = null. Unscharfer OZ/WG-Import füllt nur `praeparat` + `historie_rohtext`,
  Rest null. Die null-Felder zeigen selbst, wie „scharf" der Eintrag ist. Consumer müssen keine
  zwei Typen unterscheiden.
- **Spritzen-Import-Logik (aus README):** MJ eindeutig → vor `12/x` = 10 mg, ab `12/x` = 12,5 mg
  (`dosis_mg` gesetzt). OZ/WG nicht rekonstruierbar → nur `historie_rohtext`, `dosis_mg` = null.

### 2.3 Ereignisse (separates Array, zeitraumüberspannend)
```
ereignisse: [
  {
    id: string,                        // generierte UUID (crypto.randomUUID), stabil & kollisionsfrei
    von: "YYYY-MM-DD",
    bis: "YYYY-MM-DD",                 // = von bei Einzeltag
    kategorie: "urlaub" | "feiertag_fest" | "krankheit" | "sport" | "wiesn",
    freitext: string | null
  },
  ...
]
```
- **Keine Verknüpfung über den Tageseintrag.** Zuordnung Tag↔Ereignis wird **berechnet** aus dem
  `von`/`bis`-Bereich („welche Ereignisse überlappen diesen Tag?"). Damit wirken Änderungen/
  Löschungen sofort überall, ohne Nachpflege; konsistent mit „abgeleitete Werte nicht speichern".
  (Abweichung zur README-Formulierung „Ereignis-Verweis" im Tageseintrag — entfällt bewusst.)

### 2.4 Export-/JSON-Hülle (Backup & Seed)
```
{
  welt: "test" | "produktiv",          // Herkunfts-Kennung → harte Import-Prüfung (Mechanik-Spec)
  schema_version: 1,
  exportiert_am: "ISO-Zeitstempel",
  profil: { ... },
  tageseintraege: { "YYYY-MM-DD": {...}, ... },
  ereignisse: [ {...}, ... ]
}
```
- Gilt für App-Export **und** für die Seed-Dateien des Konvertierungs-Skripts.
- `welt` + `schema_version` sind die Grundlage der Import-Prüfung (fremde Welt → hart blockiert).

## 3. Screens & Navigation

Navigation per **Tab-Leiste unten** (reine Screen-Navigation). Profil-Icon oben rechts.
Test-Welt zeigt dauerhaft den „TESTMODUS"-Balken (Mechanik-Spec §2).

| Screen | Zweck |
|---|---|
| **Onboarding** | nur beim 1. Start (leere Welt): Stammdaten erheben (Größe-Default 1,75 m, Geschlecht, Geburtsdatum), dann in die App |
| **Eingabe** (Start) | schnell: Datum (heute vorbelegt, änderbar), Gewicht, optional Spritze, optional Ereignis |
| **Dashboard/KPIs** | aktuelles Gewicht, Diff zum Start, BMI, Fortschritt Richtung Zielgewicht, Max/Min, Gesamtverlust |
| **Diagramme** | Tagesgewicht-Linie (lineare Trendlinie) + Wochen-Ø-Balken; mit Ereignis-Markierungen |
| **Verlaufsliste** | alle Einträge chronologisch, editierbar/löschbar |
| **Profil** | Stammdaten ändern · Theme-Schalter · Backup Export/Import |

## 4. Berechnungs-Kern (isoliertes Modul reiner Funktionen)

Spiegelt die Excel-Formeln 1:1; wird gegen bekannte Excel-Werte getestet → App liefert dieselben
Zahlen wie die Excel. Nichts davon wird gespeichert.

| Größe | Regel |
|---|---|
| **BMI** | `gewicht_kg / koerpergroesse_m²` (Profil-Größe, nicht fest 1,75) |
| **Diff** | `Vortag − heute` → **positiv = Abnahme** |
| **W-AVG (kg)** | gleitender 7-Tage-Schnitt des Gewichts (erst ab dem 8. Tag belegt) |
| **W-AVG-Diff** | Gewicht vor 7 Tagen − aktueller 7-Tage-Schnitt |
| **Zielgewichte** | `BMI-Schwelle × koerpergroesse_m²` — BMI 30 & 25 als Meilensteine (bei 1,75 m: 91,875 kg bzw. 76,5625 kg) |
| **Gesamtverlust** | erstes erfasstes Gewicht − aktuelles Gewicht |
| **Alter** | aus `geburtsdatum`, tagesaktuell |
| **KW / Wochentag** | aus Datum abgeleitet |

## 5. Charts (2026-Logik als Vorbild)

- **Zwei Diagramme:** (1) *Tägliches Gewicht* — Linie, X = Datum, Y = Gewicht, lineare Trendlinie;
  (2) *Wöchentlicher Durchschnitt* — Balken über W-AVG, Trendlinie = gleitender Ø.
- **Y-Achse** sinnvoll an den Wertebereich gekoppelt (in der Excel manuell pro Jahr skaliert).
- **Ereignis-Markierungen** aus dem Ereignis-Array (Bereichs-Overlay).

## 6. UI-Grundlagen

- **Icons:** inline-SVG im Feather-Stil (`stroke="currentColor"`, `fill="none"`), kein externes
  Set, keine Deps, Größe in `em`.
- **Hell-/Dunkel-Modus:** Default folgt System (`prefers-color-scheme`); Profil-Schalter
  (hell/dunkel/system) übersteuert, Wahl im Profil gespeichert; Umsetzung über CSS Custom Properties.

## 7. Betrieb: Test-/Produktiv-Welten

Vollständig in der separaten Mechanik-Spec geregelt
([`2026-10-14-test-produktiv-mechanik-design.md`](2026-10-14-test-produktiv-mechanik-design.md)).
Kurz: zwei URLs (`/` Produktiv, `/test/` Test), harte Browser-Trennung über IndexedDB-Origin;
Seed (nur solange leer) vs. Restore (jederzeit, mit Rückfrage) streng getrennt; Import prüft
`welt`-Kennung, fremde Welt hart blockiert; Excel→JSON-Seed-Skript außerhalb der App.

## 8. Vorgeschlagene Implementierungs-Reihenfolge (Teilpläne)

Jedes Teilstück: eigener kurzer Plan → bauen → testen → nächstes. Alle stützen sich auf das in
#1 festgezurrte Fundament (Schema + Berechnungs-Kern) → sichert Nahtlosigkeit.

| # | Teilstück | Baut auf |
|---|---|---|
| 1 | **Fundament:** Datenmodell/IndexedDB-Zugriff + Welt-Konstante + Berechnungs-Kern (getestet gegen Excel-Werte) | — |
| 2 | **Seed-Skript** (Excel→JSON) + Import/Restore/Export inkl. Welt-Prüfung | 1 |
| 3 | **App-Gerüst:** PWA-Shell (Service Worker, Manifest), Routing/Welt-Marker, Theme, Tab-Navigation | 1 |
| 4 | **Screens** nacheinander: Onboarding → Eingabe → Dashboard → Charts → Verlauf | 1, 3 |

## 9. Bewusst NICHT in v1 (YAGNI)

- Kein Mehrgeräte-Sync, kein Server, kein Login, keine Benutzerverwaltung.
- Kein Excel-Parser im Browser (nur JSON-Import).
- Kein Umschalter Test↔Produktiv in der App (Trennung über URLs).

## 10. Offen für die Teilpläne (nicht Teil dieser Spec)

- Wahl der Chart-Lib; Runtime/Sprache des Seed-Skripts (Node vs. Python).
- Merge-Konfliktauflösung beim Restore (Datum-Kollisionen) — Detail des Teilplans #2.
- Technik zur Ableitung der `WELT`-Konstante aus dem Pfad — Detail des Teilplans #1/#3.
