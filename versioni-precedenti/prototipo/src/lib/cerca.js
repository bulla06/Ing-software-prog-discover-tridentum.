// Ricerca e filtri dei POI (RF-04, RF-05).

/** Minuscole e senza accenti, per confronti tolleranti ("Città" = "citta"). */
export function normalizza(testo) {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Filtra i POI per categoria e tema; se c'è una ricerca, tiene solo quelli che
 * contengono tutte le parole e li ordina: prima chi le ha nel nome.
 */
export function filtraPoi(luoghi, { q = '', categoria = null, tema = null } = {}) {
  const parole = normalizza(q).split(/\s+/).filter(Boolean)

  const risultati = []
  for (const poi of luoghi) {
    if (categoria && poi.categoria !== categoria) continue
    if (tema && !poi.temi.includes(tema)) continue
    if (parole.length === 0) {
      risultati.push({ poi, peso: 0 })
      continue
    }
    const nome = normalizza(poi.nome)
    const testo = normalizza(
      [poi.nome, poi.sintesi, poi.indirizzo, ...poi.parole_chiave, ...poi.descrizione].join(' '),
    )
    if (!parole.every((p) => testo.includes(p))) continue
    const peso = parole.filter((p) => nome.includes(p)).length
    risultati.push({ poi, peso })
  }

  return risultati.sort((a, b) => b.peso - a.peso).map((r) => r.poi)
}
