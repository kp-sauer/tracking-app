import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icon } from '../app/js/icons.js';

test('icon liefert ein SVG mit currentColor-Stroke und fill none', () => {
  const svg = icon('plus');
  assert.match(svg, /<svg[^>]*stroke="currentColor"/);
  assert.match(svg, /fill="none"/);
  assert.match(svg, /width="1em"/);
});

test('unbekanntes Icon liefert leeres SVG, wirft nicht', () => {
  const svg = icon('gibtsnicht');
  assert.match(svg, /<svg/);
});
