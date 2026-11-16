// Spritzen-Logik (reine, immutable Funktionen). Die Spritze ist IM Tageseintrag
// eingebettet (tageseintraege[datum].spritze), nicht in einem eigenen Array wie
// Ereignisse — daher operieren diese Funktionen auf der tageseintraege-Map per Datums-Key.

// true, wenn die Spritze strukturiert (bearbeitbar) ist: vorhanden UND dosis_mg gesetzt.
// Rohtext-Altdaten (nur historie_rohtext, kein dosis_mg) → false, null/undefined → false.
export function istStrukturierteSpritze(spritze) {
  return !!spritze && spritze.dosis_mg != null;
}

// Ersetzt die Spritze des bestehenden Tageseintrags an `datum` (immutabel, neues Objekt).
// gewicht_kg und übrige Felder bleiben. Existiert der Tag NICHT → unveränderte (neue) Map
// (eine Spritze ohne Gewicht wäre ein ungültiger Tageseintrag — wir legen keinen an).
export function setzeSpritze(tageseintraege, datum, spritze) {
  const tag = tageseintraege[datum];
  if (!tag) return { ...tageseintraege };
  return { ...tageseintraege, [datum]: { ...tag, spritze } };
}

// Entfernt die Spritze des Tages (spritze: null), immutabel. Unbekannter Tag → neue, gleiche Map.
export function entferneSpritze(tageseintraege, datum) {
  const tag = tageseintraege[datum];
  if (!tag) return { ...tageseintraege };
  return { ...tageseintraege, [datum]: { ...tag, spritze: null } };
}
