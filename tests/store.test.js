import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErstelleStore } from '../app/js/store.js';

function fakePersistenz(initial) {
  let gespeichert = initial;
  return {
    async laden() { return gespeichert; },
    async speichern(d) { gespeichert = d; },
    _peek() { return gespeichert; },
  };
}

test('store lädt initialen Bestand und liefert ihn via get()', async () => {
  const p = fakePersistenz({ welt: 'test', schema_version: 1, profil: null, tageseintraege: {}, ereignisse: [] });
  const store = ErstelleStore(p, 'test');
  await store.laden();
  assert.equal(store.get().welt, 'test');
});

test('store.aktualisiere persistiert und benachrichtigt Abonnenten', async () => {
  const p = fakePersistenz({ welt: 'test', schema_version: 1, profil: null, tageseintraege: {}, ereignisse: [] });
  const store = ErstelleStore(p, 'test');
  await store.laden();
  let benachrichtigt = 0;
  store.abonniere(() => { benachrichtigt++; });
  await store.aktualisiere(d => ({ ...d, profil: { koerpergroesse_m: 1.75 } }));
  assert.equal(store.get().profil.koerpergroesse_m, 1.75);
  assert.equal(p._peek().profil.koerpergroesse_m, 1.75);
  assert.equal(benachrichtigt, 1);
});

function leerDaten() {
  return { welt: 'test', schema_version: 1, profil: null, tageseintraege: {}, ereignisse: [] };
}

test('undo/redo stellt einen gelöschten Tageseintrag wieder her', async () => {
  const p = fakePersistenz(leerDaten());
  const store = ErstelleStore(p, 'test');
  await store.laden();
  assert.equal(store.kannUndo(), false);
  assert.equal(store.kannRedo(), false);

  await store.aktualisiere(d => ({ ...d, tageseintraege: { '2026-10-15': { gewicht_kg: 90.8 } } }));
  assert.equal(store.kannUndo(), true);

  await store.aktualisiere(d => ({ ...d, tageseintraege: {} }));
  assert.equal(Object.keys(store.get().tageseintraege).length, 0);

  await store.undo();
  assert.equal(store.get().tageseintraege['2026-10-15'].gewicht_kg, 90.8);
  assert.equal(p._peek().tageseintraege['2026-10-15'].gewicht_kg, 90.8); // persistiert
  assert.equal(store.kannRedo(), true);

  await store.redo();
  assert.equal(Object.keys(store.get().tageseintraege).length, 0);
});

test('undo bei leerem Stack ist ein No-Op', async () => {
  const p = fakePersistenz(leerDaten());
  const store = ErstelleStore(p, 'test');
  await store.laden();
  let benachrichtigt = 0;
  store.abonniere(() => { benachrichtigt++; });
  await store.undo();
  assert.equal(benachrichtigt, 0);
  assert.equal(store.kannUndo(), false);
});

test('aktualisiere mit { undobar:false } ändert die Undo-Historie nicht', async () => {
  const p = fakePersistenz(leerDaten());
  const store = ErstelleStore(p, 'test');
  await store.laden();
  await store.aktualisiere(d => ({ ...d, profil: { theme: 'dunkel' } }), { undobar: false });
  assert.equal(store.get().profil.theme, 'dunkel');
  assert.equal(store.kannUndo(), false);
});

test('eine neue undobare Änderung verwirft die Redo-Kette', async () => {
  const p = fakePersistenz(leerDaten());
  const store = ErstelleStore(p, 'test');
  await store.laden();
  await store.aktualisiere(d => ({ ...d, tageseintraege: { a: { gewicht_kg: 1 } } }));
  await store.undo();
  assert.equal(store.kannRedo(), true);
  await store.aktualisiere(d => ({ ...d, tageseintraege: { b: { gewicht_kg: 2 } } }));
  assert.equal(store.kannRedo(), false);
});

test('leereHistorie leert Undo- und Redo-Stacks', async () => {
  const p = fakePersistenz(leerDaten());
  const store = ErstelleStore(p, 'test');
  await store.laden();
  await store.aktualisiere(d => ({ ...d, tageseintraege: { a: { gewicht_kg: 1 } } }));
  assert.equal(store.kannUndo(), true);
  store.leereHistorie();
  assert.equal(store.kannUndo(), false);
  assert.equal(store.kannRedo(), false);
});
