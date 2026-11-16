// Gesten-Modul für Screen-Swipe. Reine Funktionen (getestet) + dünne DOM-Verdrahtung.

// Lineare Swipe-Kette. Bewusst eigene Konstante statt router.SCREENS:
// die Tab-Leiste listet 'profil' NICHT, der Swipe hat es als letztes Glied dazu.
// 'onboarding' ist absichtlich NICHT enthalten (Swipe dort aus).
export const SWIPE_REIHENFOLGE = Object.freeze([
  'dashboard', 'eingabe', 'charts', 'verlauf', 'profil'
]);

// Horizontale Interaktionszonen: startet die Geste hier, zählt sie NICHT als Swipe.
// Eine Stelle für alle solchen Zonen (bei neuen horizontalen Elementen hier ergänzen).
//  .u-over      = uPlot-Chartfläche (Tap→Vollbild + Scrubbing, charts.js)
//  .tage-pills  = scrollbare Tage-Pills (charts.js, dashboard.js)
//  .jahr-leiste = scrollbare Jahr-Pills (verlauf.js)
//  .datum-picker = geöffnetes Datums-Rädchen (felder.js) – zugeklappte .datum-anzeige NICHT
export const SWIPE_AUSSCHLUSS = Object.freeze([
  '.u-over', '.tage-pills', '.jahr-leiste', '.datum-picker'
]);

// true, wenn el (oder ein Vorfahr) in einer Ausschlusszone liegt. Dünne DOM-Helfer-
// funktion über closest(); nicht unit-getestet (closest ist Browser-API).
function istAusschlussZiel(el) {
  if (!el || typeof el.closest !== 'function') return false;
  return SWIPE_AUSSCHLUSS.some(sel => el.closest(sel));
}

// Nachbar in der Kette: 'links' = ein Schritt vorwärts (nächster Screen),
// 'rechts' = ein Schritt zurück. null am Rand oder bei unbekannter Eingabe.
export function nachbarScreen(aktuell, richtung) {
  const i = SWIPE_REIHENFOLGE.indexOf(aktuell);
  if (i === -1) return null;
  const delta = richtung === 'links' ? 1 : richtung === 'rechts' ? -1 : null;
  if (delta === null) return null;
  const j = i + delta;
  return (j >= 0 && j < SWIPE_REIHENFOLGE.length) ? SWIPE_REIHENFOLGE[j] : null;
}

// Standard-Schwellen für die Swipe-Erkennung (am Gerät justierbar).
export const SWIPE_SCHWELLEN = Object.freeze({
  minDist: 50,     // Mindest-Wischweite horizontal (px)
  dominanz: 2,     // |dx| muss >= dominanz * |dy| sein (trennt von vertikalem Scroll)
  maxDauer: 500    // ms; langsamer = kein Swipe (Ziehen/Halten)
});

// Wertet eine Geste aus. start/ende = {x, y, t}. Liefert 'links' | 'rechts' | null.
// 'links'  = Finger nach links (dx < 0) → in der Kette ein Schritt vorwärts.
// 'rechts' = Finger nach rechts (dx > 0) → ein Schritt zurück.
export function swipeRichtung(start, ende, schwellen = {}) {
  const { minDist, dominanz, maxDauer } = { ...SWIPE_SCHWELLEN, ...schwellen };
  const dx = ende.x - start.x;
  const dy = ende.y - start.y;
  const dauer = ende.t - start.t;
  if (dauer >= maxDauer) return null;
  if (Math.abs(dx) <= minDist) return null;
  if (Math.abs(dx) < dominanz * Math.abs(dy)) return null;
  return dx < 0 ? 'links' : 'rechts';
}

// Hängt die Swipe-Erkennung an 'ziel' (= #screen). Bubble-Phase, passive:true →
// es wird NIE preventDefault gerufen, vertikales Scrollen bleibt unberührt.
//  optionen.aktuellerScreen() → aktueller Screen-Name (frisch aus dem Routing)
//  optionen.navigiere(screen) → führt den Screen-Wechsel aus (location.hash)
//  optionen.aktiv()           → false im Onboarding (dann kein Swipe)
// Rückgabe: Abmelde-Funktion (entfernt die Listener wieder).
export function installiereSwipe(ziel, { aktuellerScreen, navigiere, aktiv }) {
  let start = null;       // {x, y, t}
  let verworfen = false;  // true bei Multitouch oder Start in Ausschlusszone

  const onStart = (ev) => {
    if (aktiv && !aktiv()) { verworfen = true; return; }
    if (!ev.touches || ev.touches.length !== 1) { verworfen = true; return; }
    if (istAusschlussZiel(ev.target)) { verworfen = true; return; }
    const t = ev.touches[0];
    start = { x: t.clientX, y: t.clientY, t: Date.now() };
    verworfen = false;
  };

  const onMove = (ev) => {
    // Zweitfinger während der Geste (Pinch) → verwerfen.
    if (ev.touches && ev.touches.length > 1) verworfen = true;
  };

  const onEnd = (ev) => {
    if (verworfen || !start) { start = null; return; }
    const t = ev.changedTouches && ev.changedTouches[0];
    if (!t) { start = null; return; }
    const ende = { x: t.clientX, y: t.clientY, t: Date.now() };
    const richtung = swipeRichtung(start, ende);
    start = null;
    if (!richtung) return;
    const zielScreen = nachbarScreen(aktuellerScreen(), richtung);
    if (zielScreen) navigiere(zielScreen);
  };

  const onCancel = () => { start = null; verworfen = false; };

  ziel.addEventListener('touchstart', onStart, { passive: true });
  ziel.addEventListener('touchmove', onMove, { passive: true });
  ziel.addEventListener('touchend', onEnd, { passive: true });
  ziel.addEventListener('touchcancel', onCancel, { passive: true });

  return () => {
    ziel.removeEventListener('touchstart', onStart);
    ziel.removeEventListener('touchmove', onMove);
    ziel.removeEventListener('touchend', onEnd);
    ziel.removeEventListener('touchcancel', onCancel);
  };
}
