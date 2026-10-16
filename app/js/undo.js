// Reine Undo/Redo-Stack-Logik (ohne Store/IndexedDB → direkt testbar). Snapshots sind
// tiefe Kopien des JSON-serialisierbaren Datenstands. Die Funktionen mutieren NICHT ihre
// Eingaben, sondern liefern jeweils neue { undoStack, redoStack, daten }-Objekte zurück.

export const MAX_HISTORIE = 50;

// Tiefe Kopie eines JSON-serialisierbaren Werts.
export function tiefeKopie(wert) {
  return JSON.parse(JSON.stringify(wert));
}

// VOR einer Datenänderung: aktuellen Stand (snapshot) auf den undoStack legen und den
// redoStack verwerfen (eine neue Änderung macht die bisherige Redo-Kette ungültig).
// Begrenzt die Tiefe auf MAX_HISTORIE (ältesten Eintrag abwerfen).
export function pushUndo(stacks, snapshot) {
  const undoStack = [...stacks.undoStack, tiefeKopie(snapshot)];
  if (undoStack.length > MAX_HISTORIE) undoStack.shift();
  return { undoStack, redoStack: [] };
}

// Undo: aktuellen Stand auf den redoStack, letzten undoStack-Stand als neuen `daten`.
// Bei leerem undoStack unverändert (daten = aktuell).
export function wendeUndo(stacks, aktuell) {
  if (stacks.undoStack.length === 0) {
    return { undoStack: [...stacks.undoStack], redoStack: [...stacks.redoStack], daten: aktuell };
  }
  const undoStack = [...stacks.undoStack];
  const daten = undoStack.pop();
  const redoStack = [...stacks.redoStack, tiefeKopie(aktuell)];
  return { undoStack, redoStack, daten };
}

// Redo: spiegelbildlich zu wendeUndo (Stacks vertauscht).
export function wendeRedo(stacks, aktuell) {
  if (stacks.redoStack.length === 0) {
    return { undoStack: [...stacks.undoStack], redoStack: [...stacks.redoStack], daten: aktuell };
  }
  const redoStack = [...stacks.redoStack];
  const daten = redoStack.pop();
  const undoStack = [...stacks.undoStack, tiefeKopie(aktuell)];
  return { undoStack, redoStack, daten };
}
