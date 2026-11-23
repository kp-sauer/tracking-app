// Reine Funktion: Chip-Datenliste fuer einen Tag im Chart-Tooltip.
// Medikament zuerst, dann Ereignisse (gleiche Reihenfolge wie im Verlauf).
import { ereignisseAmTag } from './ereignisse.js';

const KAT_LABEL = { urlaub: 'Urlaub', feiertag_fest: 'Fest', krankheit: 'Krankheit', wiesn: 'Wiesn', sonstiges: 'Sonst' };

function medLabel(spritze) {
  if (!spritze) return null;
  if (spritze.dosis_mg != null) {
    const dosis = String(spritze.dosis_mg).replace('.', ',');
    return `${spritze.praeparat} ${dosis} mg`;
  }
  return spritze.historie_rohtext || spritze.praeparat || null;
}

// ereignisse: Array; spritze: Tageseintrag-Spritze oder null; datumIso: 'YYYY-MM-DD'.
// -> Array von { typ: 'ev'|'med', label }.
export function tooltipChips(ereignisse, spritze, datumIso) {
  const chips = [];
  const ml = medLabel(spritze);
  if (ml) chips.push({ typ: 'med', label: ml });
  for (const ev of ereignisseAmTag(ereignisse ?? [], datumIso)) {
    chips.push({ typ: 'ev', label: KAT_LABEL[ev.kategorie] || 'Ereignis' });
  }
  return chips;
}
