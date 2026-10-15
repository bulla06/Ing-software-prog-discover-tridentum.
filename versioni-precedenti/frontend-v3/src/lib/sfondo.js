// Sfondo della mappa (D-07). Si usa lo stile "dataviz-light" di MapTiler, che non disegna negozi,
// bar o servizi: sulla mappa restano strade e quartieri, e i luoghi sono quelli del progetto.
// La chiave gratuita del progetto è scritta qui, così la mappa funziona subito dopo un pull: una
// chiave per le mappe nel browser è comunque visibile a chiunque apra il sito. VITE_MAPTILER_KEY
// (frontend/.env.local o build Docker) la sostituisce; con VITE_MAPTILER_KEY=nessuna si ripiega sui
// tile standard di OpenStreetMap, che invece mostrano negozi e bar.

const CHIAVE_PROGETTO = '0Yxf3Q93jxDMQwHWzWzC'
const DA_AMBIENTE = import.meta.env.VITE_MAPTILER_KEY?.trim()
const CHIAVE = DA_AMBIENTE === 'nessuna' ? null : DA_AMBIENTE || CHIAVE_PROGETTO

export const SFONDO_CON_CHIAVE = Boolean(CHIAVE)

// Vista satellitare (pulsante sulla mappa): World Imagery di Esri, senza chiave. A Trento è molto
// più nitida del satellite di MapTiler, che a Trento agli zoom alti risulta sfocato.
// Le foto arrivano fino allo zoom 19; più in là la mappa le ingrandisce.
export const URL_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const ATTRIBUZIONE_SATELLITE =
  'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, Maxar, Earthstar Geographics, and the GIS User Community'

// Tile da 256 px, come nel ritaglio delle copertine
export const URL_SFONDO = CHIAVE
  ? `https://api.maptiler.com/maps/dataviz-light/256/{z}/{x}/{y}.png?key=${CHIAVE}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

export const SOTTODOMINI_SFONDO = CHIAVE ? [] : ['a', 'b', 'c']

export const ATTRIBUZIONE_SFONDO = CHIAVE
  ? '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// Indirizzo di una singola tessera, per il ritaglio delle copertine
export function urlTessera(sub, zoom, x, y) {
  if (CHIAVE) return `https://api.maptiler.com/maps/dataviz-light/256/${zoom}/${x}/${y}.png?key=${CHIAVE}`
  return `https://${sub}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`
}
