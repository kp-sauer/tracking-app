// Zuordnung Tag<->Ereignis wird berechnet (kein Verweis im Tageseintrag). ISO-Strings
// vergleichen sich chronologisch, daher direkter String-Vergleich.
export function ereignisseAmTag(ereignisse, datumIso) {
  return ereignisse.filter(e => e.von <= datumIso && datumIso <= e.bis);
}

export function neuesEreignis(von, bis, kategorie, freitext) {
  const id = (globalThis.crypto?.randomUUID?.())
    ?? ('e-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  return { id, von, bis, kategorie, freitext: freitext ?? null };
}

// Setzt/ersetzt das vom Eingabe-Screen für EINEN Tag angelegte Ereignis.
// Entfernt alle Ereignisse, die GENAU an `datum` BEGINNEN (von === datum) – das sind
// die vom Tagesformular erzeugten – und hängt `neuesEv` an, falls gegeben.
// Mehrtägige/fremde Ereignisse, die den Tag nur überlappen (von < datum), bleiben
// unangetastet. neuesEv === null → nur entfernen. Gibt ein NEUES Array zurück.
export function setzeTagesereignis(ereignisse, datum, neuesEv) {
  const ohneTag = ereignisse.filter(e => e.von !== datum);
  return neuesEv ? [...ohneTag, neuesEv] : ohneTag;
}

// Klassifiziert die Ereignislage für einen Tag und liefert { art, ereignis }.
// art:
//   'start'  → ein Ereignis BEGINNT an diesem Tag (von === datum). ereignis = dieses.
//              Dieser Tag ist editierbar (das Tagesereignis). Priorität vor 'laeuft'.
//   'laeuft' → kein startendes, aber ein mehrtägiges Ereignis überlappt den Tag
//              (von < datum <= bis). ereignis = dieses. Rein informativ, nicht editierbar.
//   'keins'  → kein relevantes Ereignis am Tag. ereignis = null.
export function ereignislageAmTag(ereignisse, datumIso) {
  const amTag = ereignisseAmTag(ereignisse, datumIso);
  const start = amTag.find(e => e.von === datumIso);
  if (start) return { art: 'start', ereignis: start };
  if (amTag.length > 0) return { art: 'laeuft', ereignis: amTag[0] };
  return { art: 'keins', ereignis: null };
}

// Entfernt das Ereignis mit `id`, gibt ein NEUES Array zurück (immutabel).
// Unbekannte id → inhaltlich unveränderte (neue) Liste.
export function entferneEreignis(ereignisse, id) {
  return ereignisse.filter(e => e.id !== id);
}

// Ersetzt kategorie/von/bis/freitext des Ereignisses mit `id` und gibt ein NEUES
// Array zurück (immutabel; das alte Objekt bleibt unberührt). Liegt `bis` vor `von`,
// werden beide getauscht (der Rädchen-Picker lässt beliebige Daten zu). Unbekannte id
// → inhaltlich unveränderte Liste.
export function aktualisiereEreignis(ereignisse, id, { kategorie, von, bis, freitext }) {
  let v = von, b = bis;
  if (b < v) { const t = v; v = b; b = t; }
  return ereignisse.map(e =>
    e.id === id ? { ...e, kategorie, von: v, bis: b, freitext: freitext ?? null } : e
  );
}

