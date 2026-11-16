# Swipe-Navigation zwischen den Screens

> Design-Spec, 2026-11-16. Setzt **Backlog Phase E / Commit 6** um
> (`docs/BACKLOG.md`): Wischen zwischen den Screens via touchstart/touchend.
> Kein Mockup (reines Gesten-Verhalten, nichts visuell Neues).

## Problem

Die App hat heute nur zwei Wege, den Screen zu wechseln: die untere Tab-Leiste
(Übersicht · Eingabe · Charts · Verlauf) und das Profil-Icon oben rechts. Auf dem
Handy ist ein horizontaler Wisch die erwartete, schnellere Geste — besonders um
zwischen benachbarten Screens zu springen, ohne zur Tab-Leiste zu greifen.

Ziel: horizontales Wischen wechselt den Screen, ohne bestehende horizontale
Touch-Interaktionen (Chart-Scrubbing, scrollbare Pill-Leisten, Datums-Rädchen) zu
stören.

## Entscheidung

Ein **reines Gesten-Modul** `app/js/swipe.js` mit testbaren puren Funktionen, dünn
in `main.js` an `#screen` verdrahtet. Kein animierter Übergang — ein Swipe löst
denselben `location.hash`-Wechsel aus wie ein Tab-Tap (hartes Umschalten).

Begründung (gegen Alternativen):
- **Alles inline in main.js** — kein Testpunkt, vermischt Gesten-Mathe mit
  Store/Render. Passt nicht zum Projektmuster (reine Logik isoliert, vgl.
  `sw-strategie.js`, `felder.js`).
- **Fertige Swipe-Lib** — widerspricht „Vanilla JS, kein Build, keine
  Abhängigkeiten" (README-Architektur).
- **Animiertes Gleiten** — bewusst verworfen: erfordert zwei Screens gleichzeitig
  im DOM + CSS-Transitions gegen das heutige „ein Screen wird in `#screen`
  gerendert"-Modell (`main.js render()`). Zu teuer für den Nutzen; hartes
  Umschalten ist konsistent mit dem Tab-Verhalten.

## Verhalten

### Swipe-Kette (5 Screens, linear)

```
dashboard → eingabe → charts → verlauf → profil
(Übersicht) (Eingabe) (Charts) (Verlauf) (Profil)
```

- **Swipe-Links** = nächster Screen (nach rechts in der Kette).
- **Swipe-Rechts** = vorheriger Screen.
- In **beide Richtungen** durchwischbar (auch Profil → Verlauf zurück).
- **Sackgassen:** Swipe-Rechts auf `dashboard` und Swipe-Links auf `profil` tun
  nichts (kein Wrap-Around).

Hinweis: `profil` ist in der Swipe-Kette, aber **nicht** in der Tab-Leiste — es
bleibt zusätzlich über das Profil-Icon erreichbar. Die Tab-Leiste und ihre
`.aktiv`-Markierung bleiben unverändert (für `profil` ist dann kein Tab aktiv, wie
schon heute beim Öffnen über das Icon).

### Ausgenommen

- **Onboarding:** Swipe ist nur aktiv, wenn ein Profil existiert
  (`store.get().profil` gesetzt). Im Onboarding ist auch die Tab-Leiste
  ausgeblendet (`main.js`).
- **Horizontale Interaktionszonen:** Startet die Geste (per `touchstart`-Target,
  via `closest()`) in einer der folgenden Zonen, wird der Touch für Swipe
  verworfen:
  - `.u-over` — uPlot-Chartfläche (Tap→Vollbild + Scrubbing, `charts.js`).
  - `.tage-pills` — scrollbare Tage-Pills (Charts & Dashboard).
  - `.jahr-leiste` — scrollbare Jahr-Pills (Verlauf).
  - `.datum-picker` — das (geöffnete) Datums-Rädchen (Eingabe, Charts-Zeitraum,
    Onboarding). Die zugeklappte Datumszeile (`.datum-anzeige`) ist bewusst **nicht**
    ausgenommen — dort gibt es keine horizontale Geste, Wischen ist erlaubt.

  > Die Liste lebt als Konstante `SWIPE_AUSSCHLUSS` im Modul, damit künftige
  > horizontale Zonen an einer Stelle ergänzt werden.

### Gesten-Erkennung

Schwellen (Startwerte, am Gerät justierbar):

| Kriterium | Startwert | Zweck |
|---|---|---|
| horizontale Distanz | > 50px | Mindest-Wischweite |
| Horizontal-Dominanz | \|dx\| ≥ 2·\|dy\| | trennt Wisch von vertikalem Scroll |
| Dauer | < 500ms | trennt Wisch von langsamem Ziehen/Halten |

Nur **Einzelfinger** (`touches.length === 1`); Multitouch (Pinch/Zoom) wird
verworfen.

## Architektur

### `app/js/swipe.js` (neu) — pure Funktionen + dünne Verdrahtung

```
SWIPE_REIHENFOLGE = ['dashboard','eingabe','charts','verlauf','profil']  // Konstante
SWIPE_AUSSCHLUSS  = ['.u-over','.tage-pills','.jahr-leiste','.datum-picker'] // Konstante

swipeRichtung(start, ende, schwellen?) → 'links' | 'rechts' | null
  // start/ende = {x, y, t}. Wendet Distanz-, Dominanz- und Dauer-Schwellen an.
  // 'links'  = Finger nach links gewischt (dx < 0) → nächster Screen
  // 'rechts' = Finger nach rechts gewischt (dx > 0) → vorheriger Screen
  // null = keine gültige horizontale Swipe-Geste

nachbarScreen(aktuell, richtung) → screen-name | null
  // Index in SWIPE_REIHENFOLGE ± 1; null am Rand oder wenn 'aktuell' nicht in der Kette.

istAusschlussZiel(el) → boolean
  // true, wenn el (oder ein Vorfahr) eine SWIPE_AUSSCHLUSS-Zone trifft (closest()).

installiereSwipe(ziel, { aktuellerScreen, navigiere, aktiv }) → () => void
  // Hängt touchstart/-move/-end an 'ziel' (= #screen), Bubble-Phase, passive:true.
  // Ruft bei gültiger Geste navigiere(nachbarScreen(...)) auf, sofern Nachbar ≠ null.
  // 'aktiv()' → bool (Gate: false im Onboarding). 'aktuellerScreen()' liefert den
  // aktuellen Screen frisch (Closure über main.js-Routing). Rückgabe = Abmeld-Funktion.
```

- **`passive: true`**, es wird **nie** `preventDefault()` gerufen → vertikales
  Scrollen bleibt vollständig erhalten. Der Swipe wertet nur aus und navigiert.
- **Bubble-Phase** (kein `capture`), damit die Capture-Handler der Chartfläche
  (`charts.js`) Vorrang behalten; zusätzlich schützt `SWIPE_AUSSCHLUSS`.
- Target-Prüfung passiert beim `touchstart` (merkt sich „verworfen"), damit ein
  Wisch, der auf der Chartfläche beginnt, gar nicht erst als Swipe zählt.

### `app/js/main.js` (Änderung)

- `installiereSwipe(document.getElementById('screen'), { … })` einmalig nach dem
  ersten `render()` aufrufen.
- `aktuellerScreen()` leitet sich aus demselben `routeAusHash(location.hash)` +
  Onboarding-Fallback ab, das `render()` schon nutzt → eine gemeinsame Hilfsfunktion
  `aktiverScreen()`, damit Routing und Swipe garantiert dieselbe Sicht haben.
- `aktiv()` = `!!store.get().profil` (kein Swipe im Onboarding).
- Navigation über das bestehende `navigiere(screen)` (`location.hash = '#/'+screen`)
  → löst `hashchange` → `render()` aus. Kein neuer Render-Pfad.

Kein Eingriff in `router.js`: `SCREENS` enthält `profil` bereits; die Swipe-Kette
ist eine eigene Reihenfolge-Konstante (Tab-Reihenfolge + Profil am Ende), weil die
Tab-Leiste `profil` bewusst nicht listet.

## Tests

Pure Funktionen per `node:test` (wie `tests/*.test.js`):

- **`swipeRichtung`**: klarer Links-/Rechts-Wisch; zu kurz (< 50px) → null; zu
  vertikal (Dominanz verfehlt) → null; zu langsam (> 500ms) → null; diagonaler
  Grenzfall an der 2:1-Schwelle.
- **`nachbarScreen`**: Mitte (beide Richtungen), beide Ränder (`dashboard`
  Swipe-Rechts → null, `profil` Swipe-Links → null), unbekannter Screen → null,
  volle Kette einmal durch.
- **`istAusschlussZiel`**: Treffer direkt, Treffer über Vorfahr (`closest`),
  kein Treffer.

`installiereSwipe` (DOM-Anbindung) wird **nicht** unit-getestet — dünne Verdrahtung.

## Verifikation

- **Browser (Claude, Playwright):** grobe Funktionsprüfung der Verdrahtung —
  Swipe löst Hash-/Screen-Wechsel aus, Ränder stoppen, Onboarding-Gate greift.
- **Gerät (Nutzer, verbindliche Abnahme):** Die Entwickler-Notizen warnen
  ausdrücklich, dass Playwright-Touch-Emulation das Android-Verhalten **nicht**
  zuverlässig abbildet (genau an diesem Chart-Touch-Thema gescheitert). Das echte
  Swipe-Gefühl, die Schwellen und vor allem die **Konfliktfreiheit auf der
  Chartfläche / den Pill-Leisten** nimmt der Nutzer am Handy ab. Schwellen ggf.
  danach nachjustieren.

## Deploy

Nach Abschluss Version an **beiden** Stellen hochzählen (v70 → v71):
`app/js/version.js` **und** `BUILD` in `app/sw.js` (sonst kein SW-Update am Gerät —
siehe `docs/ENTWICKLER-NOTIZEN.md`). Push macht der Nutzer via GitHub Desktop.

## Nicht in diesem Commit

- Animiertes Gleiten (verworfen, s. o.).
- Visueller Hinweis auf Wischbarkeit (z. B. Seiten-Indikator) — nicht gewünscht.
- Swipe im Onboarding.
