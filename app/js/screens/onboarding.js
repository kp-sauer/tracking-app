import { geschlechtSegment, datumsPicker } from '../felder.js';

// Erhebt Stammdaten in einer leeren Welt und schreibt sie ins Profil.
export function renderOnboarding(container, ctx) {
  container.innerHTML = `
    <p>Bitte einmalig deine Stammdaten erfassen.</p>
    <form id="ob-form">
      <label>Körpergröße (m)
        <input id="ob-groesse" type="number" step="0.01" min="1" max="2.5" value="1.75" required>
      </label>
      <label>Geschlecht</label>
      <div id="ob-geschlecht"></div>
      <label>Geburtsdatum</label>
      <div id="ob-geburt"></div>
      <button type="submit">Los geht's</button>
    </form>`;

  const geschlecht = geschlechtSegment(container.querySelector('#ob-geschlecht'), 'm');
  const datum = datumsPicker(container.querySelector('#ob-geburt'), '1990-01-01');

  container.querySelector('#ob-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const profil = {
      koerpergroesse_m: parseFloat(container.querySelector('#ob-groesse').value),
      geschlecht: geschlecht.getWert(),
      geburtsdatum: datum.getWert(),
      theme: 'system',
    };
    await ctx.store.aktualisiere(d => ({ ...d, profil }));
    ctx.navigiere('dashboard');
  });
}
