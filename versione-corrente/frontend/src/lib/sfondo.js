// Sfondo della mappa. Si usano le tessere di Google Maps (Map Tiles API): per ottenerle serve una
// sessione, che il browser chiede a Google una volta e conserva. La chiave sta in VITE_GOOGLE_MAPS_KEY
// (frontend/.env.local in sviluppo, build Docker in produzione): è visibile a chiunque apra il sito,
// quindi nella console di Google Cloud è limitata al dominio del sito e alla sola Map Tiles API.
// Senza chiave, o se Google non risponde, si ripiega su OpenStreetMap (strade) ed Esri (satellite).

const CHIAVE = import.meta.env.VITE_GOOGLE_MAPS_KEY?.trim() || null

const OSM = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  sottodomini: ['a', 'b', 'c'],
  attribuzione: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}
// World Imagery di Esri, senza chiave; le foto arrivano fino allo zoom 19
const ESRI = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  sottodomini: [],
  attribuzione: 'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics, and the GIS User Community',
}
const GOOGLE_ATTRIBUZIONE = 'Map data © <a href="https://www.google.com/intl/it/help/terms_maps/">Google</a>'

// Nella mappa stradale niente negozi, locali e fermate: restano strade e quartieri, e i luoghi sono quelli del progetto
const STILI_STRADE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

const sessioni = new Map()

/** Sessione di Google per il tipo di mappa ('roadmap' o 'satellite'): in memoria e nel browser fino alla scadenza */
export function sessioneGoogle(tipo) {
  if (!CHIAVE) return Promise.resolve(null)
  if (!sessioni.has(tipo)) {
    const chiaveArchivio = `google-sessione-${tipo}`
    sessioni.set(
      tipo,
      (async () => {
        try {
          const salvata = JSON.parse(sessionStorage.getItem(chiaveArchivio) ?? 'null')
          if (salvata && Date.parse(salvata.scade) - Date.now() > 3_600_000) return salvata.sessione
        } catch {
          /* senza archivio si chiede una sessione nuova */
        }
        const corpo = { mapType: tipo, language: 'it-IT', region: 'IT', ...(tipo === 'roadmap' ? { styles: STILI_STRADE } : {}) }
        const risposta = await fetch(`https://tile.googleapis.com/v1/createSession?key=${CHIAVE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
        })
        if (!risposta.ok) throw new Error(`Google Maps: ${risposta.status}`)
        const { session, expiry } = await risposta.json()
        try {
          sessionStorage.setItem(chiaveArchivio, JSON.stringify({ sessione: session, scade: new Date(Number(expiry) * 1000).toISOString() }))
        } catch {
          /* niente archivio: la sessione resta in memoria */
        }
        return session
      })().catch(() => {
        sessioni.delete(tipo)
        return null
      }),
    )
  }
  return sessioni.get(tipo)
}

const configGoogle = (sessione) => ({
  url: `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${sessione}&key=${CHIAVE}`,
  sottodomini: [],
  attribuzione: GOOGLE_ATTRIBUZIONE,
})

/** Dove prendere le tessere della mappa e del satellite, dato l'esito delle due sessioni di Google */
export function sfondiMappa(sessioneStrade, sessioneSatellite) {
  return {
    mappa: sessioneStrade ? configGoogle(sessioneStrade) : OSM,
    satellite: sessioneSatellite ? configGoogle(sessioneSatellite) : ESRI,
  }
}

// Le copertine dei luoghi sono ritagli fatti con poche tessere affiancate, e a ogni pagina ne servono
// decine: per non consumare la quota di Google usano OpenStreetMap
export const SFONDO_CON_CHIAVE = false
export const ATTRIBUZIONE_COPERTINA = '© OpenStreetMap'
export function urlTessera(sub, zoom, x, y) {
  return `https://${sub}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}
