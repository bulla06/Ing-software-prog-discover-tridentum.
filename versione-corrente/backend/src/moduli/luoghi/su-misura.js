// Itinerario su misura (RF-08, UC-02 3a): dato il tempo disponibile e il punto di partenza, sceglie
// le tappe una alla volta andando ogni volta al luogo più vicino che ci sta ancora nel tempo
// (camminata più sosta). È un metodo semplice e prevedibile: con poche decine di luoghi basta.

const VELOCITA_M_AL_MINUTO = 70 // circa 4 km/h, passo da centro storico
const FATTORE_PERCORSO = 1.3 // le strade non sono in linea d'aria
const SOSTA_MINUTI = { storia: 10, arte: 10, tradizioni: 10, gastronomia: 30 }
const MASSIMO_TAPPE = 12
const MINIMO_TAPPE = 2

const RAGGIO_TERRA_M = 6371000

/** Distanza in metri tra due punti [lat, lng] */
export function distanzaMetri([lat1, lng1], [lat2, lng2]) {
  const rad = (g) => (g * Math.PI) / 180
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return 2 * RAGGIO_TERRA_M * Math.asin(Math.sqrt(a))
}

export const minutiAPiedi = (metri) => (metri * FATTORE_PERCORSO) / VELOCITA_M_AL_MINUTO

/**
 * @param luoghi   [{ id, nome, categoria, temi, sintesi, posizione: [lat, lng] }]
 * @param richiesta { lat, lng, minuti, tema? }
 * @returns l'itinerario nello stesso formato di GET /api/itinerari/:id, oppure null se non si
 *          riescono a mettere insieme almeno due tappe
 */
export function creaItinerarioSuMisura(luoghi, { lat, lng, minuti, tema }) {
  const partenza = [lat, lng]
  // Senza un tema scelto, i locali restano fuori: l'itinerario è una passeggiata, non un giro di ristoranti
  const candidati = luoghi.filter((l) => (tema ? l.temi.includes(tema) : l.categoria !== 'gastronomia'))

  const tappe = []
  let qui = partenza
  let tempo = 0
  let metri = 0
  while (tappe.length < MASSIMO_TAPPE) {
    const prossima = candidati
      .filter((l) => !tappe.includes(l))
      .map((l) => ({ luogo: l, distanza: distanzaMetri(qui, l.posizione) }))
      .sort((a, b) => a.distanza - b.distanza)
      .find(({ luogo, distanza }) => tempo + minutiAPiedi(distanza) + (SOSTA_MINUTI[luogo.categoria] ?? 10) <= minuti)
    if (!prossima) break
    tappe.push(prossima.luogo)
    tempo += minutiAPiedi(prossima.distanza) + (SOSTA_MINUTI[prossima.luogo.categoria] ?? 10)
    metri += prossima.distanza
    qui = prossima.luogo.posizione
  }
  if (tappe.length < MINIMO_TAPPE) return null

  return {
    id: 'su-misura',
    titolo: null,
    tema: tema ?? null,
    // Arrotondata ai 5 minuti, come le durate degli itinerari curati dal team
    durata_minuti: Math.max(5, Math.ceil(tempo / 5) * 5),
    descrizione: null,
    partenza,
    distanza_metri: Math.round(metri * FATTORE_PERCORSO),
    tappe: tappe.map(({ id, nome, categoria, sintesi, posizione }) => ({ id, nome, categoria, sintesi, posizione })),
    tappe_rimosse: [],
  }
}
