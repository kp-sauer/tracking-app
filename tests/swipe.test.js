import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nachbarScreen, swipeRichtung, SWIPE_REIHENFOLGE } from '../app/js/swipe.js';

test('SWIPE_REIHENFOLGE ist die lineare 5er-Kette inkl. profil am Ende', () => {
  assert.deepEqual([...SWIPE_REIHENFOLGE],
    ['dashboard', 'eingabe', 'charts', 'verlauf', 'profil']);
});

test('nachbarScreen in der Mitte: links = nächster, rechts = vorheriger', () => {
  assert.equal(nachbarScreen('charts', 'links'), 'verlauf');
  assert.equal(nachbarScreen('charts', 'rechts'), 'eingabe');
});

test('nachbarScreen stoppt an beiden Rändern (kein Wrap)', () => {
  assert.equal(nachbarScreen('dashboard', 'rechts'), null);
  assert.equal(nachbarScreen('profil', 'links'), null);
});

test('nachbarScreen: dashboard links → eingabe, verlauf links → profil', () => {
  assert.equal(nachbarScreen('dashboard', 'links'), 'eingabe');
  assert.equal(nachbarScreen('verlauf', 'links'), 'profil');
  assert.equal(nachbarScreen('profil', 'rechts'), 'verlauf');
});

test('nachbarScreen: unbekannter Screen oder unbekannte Richtung → null', () => {
  assert.equal(nachbarScreen('gibtsnicht', 'links'), null);
  assert.equal(nachbarScreen('charts', 'hoch'), null);
});

// start/ende = {x, y, t} (t = Zeitstempel ms). Schwellen-Defaults: dist>50, |dx|>=2|dy|, dauer<500.
test('swipeRichtung: klarer Links-Wisch (Finger nach links) → "links"', () => {
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 200, y: 110, t: 150 }), 'links');
});

test('swipeRichtung: klarer Rechts-Wisch (Finger nach rechts) → "rechts"', () => {
  assert.equal(swipeRichtung({ x: 100, y: 100, t: 0 }, { x: 220, y: 90, t: 150 }), 'rechts');
});

test('swipeRichtung: zu kurze Strecke (<=50px) → null', () => {
  assert.equal(swipeRichtung({ x: 200, y: 100, t: 0 }, { x: 160, y: 100, t: 100 }), null);
});

test('swipeRichtung: zu vertikal (Dominanz |dx|>=2|dy| verfehlt) → null', () => {
  // dx=-60, dy=40 → 60 < 2*40=80 → keine horizontale Dominanz
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 240, y: 140, t: 150 }), null);
});

test('swipeRichtung: zu langsam (>=500ms) → null', () => {
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 180, y: 100, t: 600 }), null);
});

test('swipeRichtung: Grenzfall genau an 2:1-Dominanz zählt (dx=-80, dy=40)', () => {
  // |dx|=80 >= 2*|dy|=80 → erfüllt; dist 80>50; schnell → "links"
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 220, y: 140, t: 150 }), 'links');
});

test('swipeRichtung: Schwellen überschreibbar', () => {
  // mit dist-Schwelle 200 ist ein 120px-Wisch zu kurz → null
  assert.equal(
    swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 180, y: 100, t: 150 }, { minDist: 200 }),
    null
  );
});

test('swipeRichtung: genau 50px Distanz ist NICHT genug (<=50 → null)', () => {
  // dx = 150-200 = -50 → exakt an der minDist-Grenze → null
  assert.equal(swipeRichtung({ x: 200, y: 100, t: 0 }, { x: 150, y: 100, t: 100 }), null);
});

test('swipeRichtung: 51px Distanz reicht (>50 → links)', () => {
  // dx = 149-200 = -51 → knapp über der Grenze, horizontal dominant, schnell → links
  assert.equal(swipeRichtung({ x: 200, y: 100, t: 0 }, { x: 149, y: 100, t: 100 }), 'links');
});

test('swipeRichtung: genau 500ms Dauer ist zu langsam (>=maxDauer → null)', () => {
  // großer, horizontaler Wisch, aber Dauer exakt 500ms → null
  assert.equal(swipeRichtung({ x: 300, y: 100, t: 0 }, { x: 180, y: 100, t: 500 }), null);
});

test('swipeRichtung: Rechts-Wisch an der 2:1-Dominanzgrenze zählt (dx=+80, dy=-40 → rechts)', () => {
  // |dx|=80 >= 2*|dy|=80 erfüllt; dist 80>50; schnell; dx>0 → rechts (Symmetrie zum Links-Grenzfall)
  assert.equal(swipeRichtung({ x: 100, y: 140, t: 0 }, { x: 180, y: 100, t: 150 }), 'rechts');
});
