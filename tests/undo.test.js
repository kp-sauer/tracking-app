import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushUndo, wendeUndo, wendeRedo, tiefeKopie, MAX_HISTORIE } from '../app/js/undo.js';

const leer = () => ({ undoStack: [], redoStack: [] });

test('tiefeKopie entkoppelt verschachtelte Objekte', () => {
  const a = { x: { y: [1, 2] } };
  const b = tiefeKopie(a);
  b.x.y.push(3);
  assert.deepEqual(a.x.y, [1, 2]);
});

test('pushUndo legt Snapshot ab und leert redoStack', () => {
  const start = { undoStack: [], redoStack: [{ alt: true }] };
  const r = pushUndo(start, { nr: 1 });
  assert.deepEqual(r.undoStack, [{ nr: 1 }]);
  assert.deepEqual(r.redoStack, []);
});

test('pushUndo kopiert tief (spätere Mutation des Originals wirkt nicht in den Stack)', () => {
  const snap = { nr: 1 };
  const r = pushUndo(leer(), snap);
  snap.nr = 999;
  assert.equal(r.undoStack[0].nr, 1);
});

test('wendeUndo bewegt aktuellen Stand auf redo und holt letzten undo-Stand', () => {
  const stacks = { undoStack: [{ nr: 1 }], redoStack: [] };
  const r = wendeUndo(stacks, { nr: 2 });
  assert.deepEqual(r.daten, { nr: 1 });
  assert.deepEqual(r.redoStack, [{ nr: 2 }]);
  assert.deepEqual(r.undoStack, []);
});

test('wendeUndo bei leerem undoStack → unverändert, daten = aktuell', () => {
  const r = wendeUndo(leer(), { nr: 2 });
  assert.deepEqual(r.daten, { nr: 2 });
  assert.deepEqual(r.undoStack, []);
  assert.deepEqual(r.redoStack, []);
});

test('wendeRedo bei leerem redoStack → unverändert, daten = aktuell', () => {
  const r = wendeRedo(leer(), { nr: 2 });
  assert.deepEqual(r.daten, { nr: 2 });
  assert.deepEqual(r.undoStack, []);
  assert.deepEqual(r.redoStack, []);
});

test('wendeRedo spiegelt wendeUndo (hin und zurück)', () => {
  const r1 = wendeUndo({ undoStack: [{ nr: 1 }], redoStack: [] }, { nr: 2 });
  assert.deepEqual(r1.daten, { nr: 1 });
  const r2 = wendeRedo(r1, r1.daten);
  assert.deepEqual(r2.daten, { nr: 2 });
  assert.deepEqual(r2.undoStack, [{ nr: 1 }]);
  assert.deepEqual(r2.redoStack, []);
});

test('mehrstufiges Undo/Redo bewegt die Zustände korrekt', () => {
  // Simuliere drei aufeinanderfolgende Änderungen 0 → 1 → 2 → 3.
  let stacks = leer();
  let daten = { nr: 0 };
  for (const nr of [1, 2, 3]) {
    const p = pushUndo(stacks, daten);
    stacks = p;
    daten = { nr };
  }
  // Stand jetzt: daten={nr:3}, undoStack=[0,1,2]
  assert.deepEqual(stacks.undoStack.map(s => s.nr), [0, 1, 2]);

  // Zweimal undo → {nr:1}
  let u = wendeUndo(stacks, daten); stacks = u; daten = u.daten;
  assert.equal(daten.nr, 2);
  u = wendeUndo(stacks, daten); stacks = u; daten = u.daten;
  assert.equal(daten.nr, 1);
  assert.deepEqual(stacks.redoStack.map(s => s.nr), [3, 2]);

  // Einmal redo → {nr:2}
  const r = wendeRedo(stacks, daten); stacks = r; daten = r.daten;
  assert.equal(daten.nr, 2);
  assert.deepEqual(stacks.undoStack.map(s => s.nr), [0, 1]);
});

test('neue Änderung nach Undo verwirft die Redo-Kette', () => {
  let stacks = pushUndo(leer(), { nr: 0 });
  let daten = { nr: 1 };
  const u = wendeUndo(stacks, daten); stacks = u; daten = u.daten; // daten={nr:0}, redo=[1]
  assert.deepEqual(stacks.redoStack.map(s => s.nr), [1]);
  const p = pushUndo(stacks, daten); // neue Änderung
  assert.deepEqual(p.redoStack, []);
});

test('pushUndo begrenzt die Tiefe auf MAX_HISTORIE', () => {
  let stacks = leer();
  for (let i = 0; i < MAX_HISTORIE + 10; i++) stacks = pushUndo(stacks, { nr: i });
  assert.equal(stacks.undoStack.length, MAX_HISTORIE);
  // Ältester Eintrag wurde abgeworfen → erster ist nicht mehr nr:0.
  assert.equal(stacks.undoStack[0].nr, 10);
});
