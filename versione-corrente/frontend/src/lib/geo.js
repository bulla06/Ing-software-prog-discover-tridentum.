// Funzioni geografiche usate da mappa, itinerari e gioco.

/** Piazza Duomo: centro della mappa quando la posizione non è disponibile (UC-01 3a). */
export const CENTRO_TRENTO = [46.0670, 11.1214]

const RAGGIO_TERRA_M = 6371000

/** Distanza in metri tra due punti [lat, lng] (formula dell'emisenoverso). */
export function distanzaMetri([lat1, lng1], [lat2, lng2]) {
  const rad = (g) => (g * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * RAGGIO_TERRA_M * Math.asin(Math.sqrt(a))
}

/** Distanza leggibile: "350 m" oppure "1,2 km". */
export function formattaDistanza(metri, lingua = 'it') {
  if (metri < 1000) return `${Math.round(metri / 10) * 10} m`
  return `${(metri / 1000).toLocaleString(lingua, { maximumFractionDigits: 1 })} km`
}

/** Lunghezza in metri di un percorso che passa per i punti nell'ordine dato. */
export function lunghezzaPercorso(punti) {
  let totale = 0
  for (let i = 1; i < punti.length; i++) totale += distanzaMetri(punti[i - 1], punti[i])
  return totale
}

/** Punteggio massimo di un livello di "Dov'era?": il calcolo lo fa il server (Fase 3, D-14) */
export const PUNTEGGIO_MAX = 1000

/** Direzione in gradi (0 = nord, 90 = est) per andare dal punto `da` al punto `a`. */
export function direzioneGradi([lat1, lng1], [lat2, lng2]) {
  const rad = (g) => (g * Math.PI) / 180
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2))
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** Differenza tra due direzioni in gradi, da 0 a 180 (350° e 10° distano 20°). */
export function scartoAngolare(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * RF-06 "Cosa sto guardando?": i luoghi davanti a chi si trova in `posizione` e guarda verso
 * `direzione` (gradi dalla bussola), entro `raggio` metri e `apertura` gradi a destra e a sinistra,
 * dal più vicino. Senza direzione (niente bussola) restituisce i luoghi più vicini entro `raggioVicini`.
 */
export function luoghiInVista(posizione, direzione, luoghi, { raggio = 300, apertura = 25, raggioVicini = 150 } = {}) {
  const conDati = luoghi.map((poi) => ({
    poi,
    distanza: distanzaMetri(posizione, poi.posizione),
    direzione: direzioneGradi(posizione, poi.posizione),
  }))
  const inVista =
    direzione == null
      ? conDati.filter((l) => l.distanza <= raggioVicini)
      : conDati.filter((l) => l.distanza <= raggio && (l.distanza < 15 || scartoAngolare(l.direzione, direzione) <= apertura))
  return inVista.sort((a, b) => a.distanza - b.distanza)
}
