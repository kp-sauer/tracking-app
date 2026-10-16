// Registry: Screen-Name -> render(container, ctx). Echte Screens ersetzen diese Platzhalter.
// ctx = { store, welt, navigiere }.
import { renderOnboarding } from './onboarding.js';
import { renderEingabe } from './eingabe.js';
import { renderDashboard } from './dashboard.js';
import { renderCharts } from './charts.js';
import { renderVerlauf } from './verlauf.js';
import { renderProfil } from './profil.js';
export const screens = {
  onboarding: renderOnboarding,
  eingabe: renderEingabe,
  dashboard: renderDashboard,
  charts: renderCharts,
  verlauf: renderVerlauf,
  profil: renderProfil,
};
