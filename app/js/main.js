import { aktuelleWelt } from './world.js';
import { effektivesTheme, effektiveSkala } from './theme.js';
import { routeAusHash } from './router.js';
import { icon } from './icons.js';
import { ErstelleStore, indexedDbPersistenz } from './store.js';
import { screens } from './screens/index.js';

const welt = aktuelleWelt();
if (welt === 'test') {
  const badge = document.getElementById('test-badge'); if (badge) badge.hidden = false;
  document.title = 'TESTMODUS – tracking-app';
}

const SCREEN_TITEL = { dashboard: 'Übersicht', eingabe: 'Eingabe', charts: 'Charts', verlauf: 'Verlauf', profil: 'Profil', onboarding: 'Willkommen' };

document.getElementById('profil-link').innerHTML = icon('profil');
const TAB_ICON = { dashboard: 'home', eingabe: 'plus', charts: 'chart', verlauf: 'liste' };
for (const a of document.querySelectorAll('#tabs a')) {
  a.insertAdjacentHTML('afterbegin', icon(TAB_ICON[a.dataset.screen]));
}

const store = ErstelleStore(indexedDbPersistenz(welt), welt);

// Theme-Toggle: zeigt Mond (Hell) bzw. Sonne (Dunkel); CSS blendet je nach data-theme um.
const themeBtn = document.getElementById('theme-toggle');
if (themeBtn) {
  themeBtn.innerHTML = `<span class="ico-mond">${icon('mond')}</span><span class="ico-sonne">${icon('sonne')}</span>`;
  themeBtn.addEventListener('click', async () => {
    const aktuellEffektiv = document.body.dataset.theme; // 'hell' | 'dunkel'
    const neu = aktuellEffektiv === 'dunkel' ? 'hell' : 'dunkel';
    await store.aktualisiere(d => ({ ...d, profil: { ...(d.profil ?? {}), theme: neu } }), { undobar: false });
  });
}

// Undo/Redo-Kopfbuttons (nur auf dem Verlauf-Screen sichtbar; Sichtbarkeit/disabled
// steuert render()). Datenänderungen app-weit, nur aktuelle Sitzung (siehe store.js).
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
if (undoBtn) {
  undoBtn.innerHTML = icon('undo');
  undoBtn.addEventListener('click', () => store.undo());
}
if (redoBtn) {
  redoBtn.innerHTML = icon('redo');
  redoBtn.addEventListener('click', () => store.redo());
}

function themeAnwenden() {
  const wahl = store.get().profil?.theme ?? 'system';
  const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  document.body.dataset.theme = effektivesTheme(wahl, prefersDark);
}

// Anzeigegröße: skaliert die ganze App wie Browser-Zoom (CSS nutzt feste px, daher zoom
// statt rem). effektiveSkala klemmt/normalisiert den gespeicherten Wert auf eine Stufe.
function skalaAnwenden() {
  const skala = effektiveSkala(store.get().profil?.anzeige_skala);
  document.documentElement.style.zoom = skala / 100;
}

function navigiere(screen) { location.hash = '#/' + screen; }

function render() {
  themeAnwenden();
  skalaAnwenden();
  const daten = store.get();
  let screen = routeAusHash(location.hash);
  if (!daten.profil) screen = 'onboarding';

  const titelEl = document.getElementById('titel');
  if (titelEl) titelEl.textContent = SCREEN_TITEL[screen] ?? 'tracking-app';

  const ziel = document.getElementById('screen');
  (screens[screen] ?? screens.eingabe)(ziel, { store, welt, navigiere });

  for (const a of document.querySelectorAll('#tabs a')) {
    a.classList.toggle('aktiv', a.dataset.screen === screen);
  }
  document.getElementById('tabs').style.display = daten.profil ? '' : 'none';

  // Undo/Redo nur im Verlauf sichtbar; disabled je nach Stack-Füllstand.
  const imVerlauf = screen === 'verlauf';
  if (undoBtn) { undoBtn.hidden = !imVerlauf; undoBtn.disabled = !store.kannUndo(); }
  if (redoBtn) { redoBtn.hidden = !imVerlauf; redoBtn.disabled = !store.kannRedo(); }
}

store.abonniere(render);
globalThis.addEventListener('hashchange', render);

await store.laden();
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
