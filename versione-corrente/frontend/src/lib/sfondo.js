// Sfondo della mappa (D-07). Con una chiave gratuita di MapTiler (variabile VITE_MAPTILER_KEY,
// in versione-corrente/frontend/.env.local) si usa lo stile "dataviz-light", che non disegna
// negozi, bar o servizi: sulla mappa restano strade e quartieri, e i luoghi sono quelli del progetto.
// Senza chiave si ripiega sui tile standard di OpenStreetMap, che invece li mostrano.

const CHIAVE = import.meta.env.VITE_MAPTILER_KEY?.trim() || null

export const SFONDO_CON_CHIAVE = Boolean(CHIAVE)

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
