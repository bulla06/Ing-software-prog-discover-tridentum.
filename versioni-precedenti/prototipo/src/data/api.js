// Accesso ai dati dei luoghi.
//
// Per ora i dati sono file JSON nel frontend: il database non c'è ancora.
// Ogni funzione corrisponde a un endpoint dell'API Gateway (Fase 3 §5.2) ed è
// asincrona come una vera chiamata HTTP: quando il backend sarà pronto basterà
// sostituire il corpo con una fetch, senza toccare le pagine.

import luoghi from './luoghi.json'
import itinerari from './itinerari.json'
import tradizioni from './tradizioni.json'
import gusto from './gusto.json'
import gioco from './gioco.json'
import { filtraPoi } from '../lib/cerca.js'

const perId = new Map(luoghi.map((p) => [p.id, p]))

/** GET /api/poi?categoria=…&tema=… · GET /api/poi/cerca?q=… */
export async function getPoi(filtri = {}) {
  return filtraPoi(luoghi, filtri)
}

/** GET /api/poi/{id} — null se il POI non esiste. */
export async function getPoiById(id) {
  return perId.get(id) ?? null
}

/** GET /api/itinerari?durata_max=… */
export async function getItinerari({ durataMax = null } = {}) {
  return itinerari.filter((it) => durataMax == null || it.durata_minuti <= durataMax)
}

/** GET /api/itinerari/{id} — con le tappe già risolte nei rispettivi POI. */
export async function getItinerario(id) {
  const it = itinerari.find((i) => i.id === id)
  if (!it) return null
  return { ...it, tappe: it.tappe.map((t) => perId.get(t)) }
}

/** Itinerari che passano per un POI (per la scheda). */
export async function getItinerariConPoi(poiId) {
  return itinerari.filter((it) => it.tappe.includes(poiId))
}

/** GET /api/tradizioni */
export async function getTradizioni() {
  return tradizioni.map((t) => ({ ...t, luoghi: t.luoghi.map((id) => perId.get(id)) }))
}

/** Piatti tipici della sezione Gusto (RF-20). */
export async function getGusto() {
  return gusto
}

/** GET /api/gioco/partita — `n` livelli in ordine casuale. */
export async function getPartita(n = 5) {
  const mescolati = [...gioco]
  for (let i = mescolati.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[mescolati[i], mescolati[j]] = [mescolati[j], mescolati[i]]
  }
  return mescolati.slice(0, n).map((l) => ({ ...l, poi: perId.get(l.poi) }))
}

/** Categorie e temi presenti nei dati, per costruire i filtri. */
export function getFacette() {
  const categorie = [...new Set(luoghi.map((p) => p.categoria))]
  const temi = [...new Set(luoghi.flatMap((p) => p.temi))]
  return { categorie, temi }
}

/** Esportazione aperta dei POI in GeoJSON (RNF-PO04). */
export function esportaGeoJson() {
  return {
    type: 'FeatureCollection',
    features: luoghi.map(({ posizione: [lat, lng], ...props }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: props,
    })),
  }
}
