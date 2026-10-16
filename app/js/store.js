import { leereDaten, ladeDaten, speichereDaten } from './db.js';
import { pushUndo, wendeUndo, wendeRedo, tiefeKopie } from './undo.js';

// Standard-Persistenz über IndexedDB (Teil 1). Für Tests injizierbar.
export function indexedDbPersistenz(welt) {
  return {
    laden: () => ladeDaten(welt),
    speichern: (d) => speichereDaten(d),
  };
}

export function ErstelleStore(persistenz, welt) {
  let daten = leereDaten(welt);
  const abonnenten = new Set();
  // Undo/Redo nur IM SPEICHER (session-only, überlebt KEINEN Reload). Erfasst
  // ausschließlich DATENänderungen (Default undobar:true); Profil/Theme/Skala/Ziel-
  // Autosaves und Import rufen aktualisiere mit { undobar:false } auf.
  let stacks = { undoStack: [], redoStack: [] };

  function benachrichtige() { for (const a of abonnenten) a(daten); }
  async function persistiere() { await persistenz.speichern(daten); }

  return {
    async laden() { daten = await persistenz.laden(); return daten; },
    get() { return daten; },
    abonniere(fn) { abonnenten.add(fn); return () => abonnenten.delete(fn); },
    async aktualisiere(fn, opts = {}) {
      if (opts.undobar !== false) {
        // Stand VOR der Änderung sichern (tiefe Kopie), Redo-Kette verwerfen.
        stacks = { ...pushUndo(stacks, daten) };
        stacks.redoStack = []; // pushUndo liefert bereits [], explizit für Klarheit
      }
      daten = fn(daten);
      await persistiere();
      benachrichtige();
      return daten;
    },
    async undo() {
      if (stacks.undoStack.length === 0) return daten;
      const r = wendeUndo(stacks, tiefeKopie(daten));
      stacks = { undoStack: r.undoStack, redoStack: r.redoStack };
      daten = r.daten;
      await persistiere();
      benachrichtige();
      return daten;
    },
    async redo() {
      if (stacks.redoStack.length === 0) return daten;
      const r = wendeRedo(stacks, tiefeKopie(daten));
      stacks = { undoStack: r.undoStack, redoStack: r.redoStack };
      daten = r.daten;
      await persistiere();
      benachrichtige();
      return daten;
    },
    kannUndo() { return stacks.undoStack.length > 0; },
    kannRedo() { return stacks.redoStack.length > 0; },
    // Beide Stacks leeren (z.B. nach Backup-Import, der nicht undobar sein soll).
    leereHistorie() { stacks = { undoStack: [], redoStack: [] }; },
  };
}
