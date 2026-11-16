import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../app/js/version.js'; // Seiteneffekt: setzt globalThis.APP_VERSION

// version.js ist EINE zentrale Quelle für UI-Fußzeile und SW-Cache-Name.
// Hinweis: Die Datei existiert bereits und setzt die Property, daher ist kein
// echter RED-Zustand herstellbar — der Test dient als Regressionsschutz, damit
// die Property nicht versehentlich entfernt wird oder ein ungültiges Format bekommt.
test('version.js setzt globalThis.APP_VERSION als nicht-leeren Zahl-String', () => {
  assert.equal(typeof globalThis.APP_VERSION, 'string');
  assert.match(globalThis.APP_VERSION, /^\d+$/);
});

// Der SW leitet den Cache-Namen genau so ab (importScripts + 'tracking-shell-v' + APP_VERSION).
// Hier als reine Logik geprüft, ohne den SW selbst zu laden.
test('Cache-Name wird korrekt aus APP_VERSION aufgebaut', () => {
  const cache = 'tracking-shell-v' + globalThis.APP_VERSION;
  assert.match(cache, /^tracking-shell-v\d+$/);
});
