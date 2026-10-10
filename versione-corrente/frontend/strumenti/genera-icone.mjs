// Genera src/components/icone-svg.js con i disegni delle icone Phosphor usate dal sito, solo negli
// stili che servono (regular, bold, fill). Il pacchetto React di Phosphor porta con sé tutti e sei
// gli stili di ogni icona: con i soli disegni il JavaScript iniziale pesa circa 30 kB in meno (RNF-P01).
//
//   npm run genera-icone -w versione-corrente/frontend   (dopo aver aggiunto un'icona a ICONE qui sotto)

import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Nome usato dal sito → nome dell'icona Phosphor (https://phosphoricons.com)
const ICONE = {
  mappa: 'map-trifold',
  itinerari: 'path',
  scopri: 'compass',
  gioco: 'target',
  profilo: 'user-circle',
  cerca: 'magnifying-glass',
  posizione: 'crosshair',
  luogo: 'map-pin',
  elenco: 'list-bullets',
  indietro: 'arrow-left',
  precedente: 'caret-left',
  avanti: 'caret-right',
  chiudi: 'x',
  salva: 'bookmark-simple',
  esterno: 'arrow-square-out',
  ricordo: 'camera',
  segnala: 'flag',
  calendario: 'calendar-blank',
  orologio: 'clock',
  scarica: 'download-simple',
  lingua: 'translate',
  info: 'info',
  piedi: 'person-simple-walk',
  record: 'trophy',
  foto: 'image',
  ingrandisci: 'arrows-out',
  fatto: 'check',
  condividi: 'share-network',
  offline: 'wifi-slash',
  attenzione: 'warning',
  privacy: 'shield-check',
  modifica: 'pencil-simple',
  carica: 'upload-simple',
  fine: 'flag-checkered',
  suMisura: 'magic-wand',
  inquadra: 'scan',
  direzione: 'navigation-arrow',
  // Categorie dei luoghi
  storia: 'bank',
  arte: 'paint-brush',
  tradizioni: 'mask-happy',
  gastronomia: 'fork-knife',
}
const STILI = ['regular', 'bold', 'fill']

const qui = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const disegno = (nome, stile) => {
  const file = require.resolve(`@phosphor-icons/core/assets/${stile}/${nome}${stile === 'regular' ? '' : `-${stile}`}.svg`)
  const svg = readFileSync(file, 'utf8')
  return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

const voci = Object.entries(ICONE).map(
  ([nostro, phosphor]) => `  ${JSON.stringify(nostro)}: {\n${STILI.map((s) => `    ${s}: ${JSON.stringify(disegno(phosphor, s))},`).join('\n')}\n  },`,
)
writeFileSync(
  path.join(qui, '..', 'src', 'components', 'icone-svg.js'),
  `// File generato da strumenti/genera-icone.mjs: non modificarlo a mano.\n` +
    `// Icone Phosphor (https://phosphoricons.com, licenza MIT), viewBox 0 0 256 256.\n` +
    `export default {\n${voci.join('\n')}\n}\n`,
)
console.log(`${voci.length} icone in ${STILI.length} stili`)
