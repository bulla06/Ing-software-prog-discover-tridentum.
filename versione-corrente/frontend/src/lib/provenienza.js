// Da dove viene una foto: scattata ora con il sito (o con la fotocamera del telefono) oppure scelta dalla galleria,
// e dove è stata scattata (posizione scritta dentro il file, o quella del telefono se la foto è appena scattata).
import { distanzaMetri } from './geo.js'

/** Entro questa distanza da chi guarda, la foto vale come "scattata qui vicino" */
export const RAGGIO_QUI_M = 250

/** Posizione e data scritte nel file (null se la foto non le contiene: succede spesso con le foto inviate da altre app) */
export async function leggiDatiFoto(file) {
  try {
    const { gps, parse } = await import('exifr/dist/lite.esm.mjs')
    const [posizione, dati] = await Promise.all([gps(file).catch(() => null), parse(file, ['DateTimeOriginal']).catch(() => null)])
    const coordinate = typeof posizione?.latitude === 'number' && typeof posizione?.longitude === 'number' ? [posizione.latitude, posizione.longitude] : null
    return { gps: coordinate, data: dati?.DateTimeOriginal instanceof Date ? dati.DateTimeOriginal : null }
  } catch {
    return { gps: null, data: null }
  }
}

/**
 * Giudizio sulla provenienza di una foto.
 * - `origine`: 'fotocamera' (scattata ora) o 'libreria' (scelta dalla galleria)
 * - `gps`: dove è stata scattata, se si sa
 * - `posizioneAttuale`: dove si trova ora chi usa il sito, se si sa
 * Risultato: { tipo: 'adesso' | 'qui' | 'altrove' | 'senzaPosizione' | 'senzaTua', origine, distanza }
 */
export function valutaProvenienza({ origine, gps, posizioneAttuale }) {
  if (!gps) return { tipo: 'senzaPosizione', origine, distanza: null }
  if (origine === 'fotocamera') return { tipo: 'adesso', origine, distanza: null }
  if (!posizioneAttuale) return { tipo: 'senzaTua', origine, distanza: null }
  const distanza = distanzaMetri(gps, posizioneAttuale)
  return { tipo: distanza <= RAGGIO_QUI_M ? 'qui' : 'altrove', origine, distanza }
}
