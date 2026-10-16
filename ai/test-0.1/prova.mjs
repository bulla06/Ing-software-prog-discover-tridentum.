// Prova: dice a quale luogo assomiglia una foto (o tutte le foto di una cartella).
//
// Uso:  node prova.mjs <foto o cartella> [altre...] [--soglia 0.6] [--vicine 2]
//       node prova.mjs            (prova tutte le foto che trova in nuove/)
//
// Tre possibili risposte, con soglie provvisorie calcolate dalle foto di riferimento (vedi indice.json):
//   riconosciuto            la foto somiglia molto a un luogo e l'altro è lontano
//   non sono sicuro         somiglia a un luogo ma poco, oppure i due luoghi sono vicini
//   non assomiglia a nessuno  la somiglianza è molto più bassa di quella che hanno le foto giuste
//
// Se la foto è già nell'indice (è una delle foto di riferimento, anche con un altro nome) la tolgo dai
// riferimenti insieme alle foto vicine per numero (di solito quasi uguali, scattate a raffica): altrimenti
// si confronterebbe con se stessa e il risultato non direbbe niente. Per una prova davvero onesta usa foto
// nuove, per esempio in nuove/.

import fs from 'node:fs'
import path from 'node:path'
import { CARTELLA, CARTELLA_FOTO, caricaModello, decidi, formato, improntaDi, punteggi, somiglianza } from './lib.mjs'

const args = process.argv.slice(2)
const opzione = (nome, predefinito) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : predefinito
}
const numero = (testo) => (testo == null ? null : Number(String(testo).replace(',', '.')))
const sogliaManuale = numero(opzione('--soglia', null))
const vicine = Number(opzione('--vicine', 2))
const percorsi = args.filter((a, i) => !a.startsWith('--') && !['--soglia', '--vicine'].includes(args[i - 1]))

const fileIndice = path.join(CARTELLA, 'indice.json')
if (!fs.existsSync(fileIndice)) {
  console.error('Manca indice.json: prima esegui  node costruisci-indice.mjs')
  process.exit(1)
}
const indice = JSON.parse(fs.readFileSync(fileIndice, 'utf8'))
const nomeBello = (classe) => classe.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ')

const ESTENSIONI = /\.(jpe?g|png|webp|heic)$/i
function immagini(p) {
  const assoluto = path.resolve(p)
  if (!fs.existsSync(assoluto)) throw new Error(`Non trovo ${p}`)
  if (!fs.statSync(assoluto).isDirectory()) return [assoluto]
  return fs.readdirSync(assoluto, { withFileTypes: true }).flatMap((v) => {
    const figlio = path.join(assoluto, v.name)
    return v.isDirectory() ? immagini(figlio) : ESTENSIONI.test(v.name) ? [figlio] : []
  })
}
const cartellaNuove = path.join(CARTELLA, 'nuove')
const lista = (percorsi.length ? percorsi : fs.existsSync(cartellaNuove) ? [cartellaNuove] : []).flatMap(immagini)
if (!lista.length) {
  console.error('Nessuna foto da provare. Uso:  node prova.mjs <foto o cartella>   oppure metti le foto in nuove/')
  process.exit(1)
}

const soglie = { ...indice.soglie }
if (sogliaManuale != null) soglie.riconosciuto_da = sogliaManuale
console.log(`Indice: ${indice.riferimenti.length} foto, luoghi: ${Object.keys(indice.luoghi).map(nomeBello).join(', ')} · modello ${indice.dtype}, ${indice.descrizione_variante}`)
console.log(`Soglie: riconosciuto da ${formato(soglie.riconosciuto_da, 2)} (margine almeno ${formato(soglie.margine_minimo, 2)}), nessuno dei due sotto ${formato(soglie.nessuno_sotto, 2)}`)
const caricato = await caricaModello(indice.dtype)

// Posizione di ogni foto di riferimento dentro il suo luogo (per togliere le vicine)
const posizione = new Map()
for (const luogo of Object.keys(indice.luoghi)) indice.riferimenti.filter((r) => r.classe === luogo).forEach((r, p) => posizione.set(r.file, p))

let giuste = 0
let conLuogoNoto = 0
// Una foto identica a una dell'indice ha somiglianza ~1; le foto vicine di una serie arrivano al massimo a 0,975
const SOMIGLIANZA_IDENTICA = 0.99

for (const file of lista) {
  const { [indice.variante]: q } = await improntaDi(caricato, file)

  // Se la foto è già nell'indice (anche con un altro nome o in un'altra cartella) la tolgo dai riferimenti insieme
  // alle foto vicine del suo luogo: altrimenti si confronterebbe con se stessa.
  const gemella = indice.riferimenti.map((r) => ({ r, s: somiglianza(q, r.v) })).sort((a, b) => b.s - a.s)[0]
  const nellIndice = gemella.s >= SOMIGLIANZA_IDENTICA ? gemella.r : null
  const relativo = path.relative(CARTELLA_FOTO, file).split(path.sep).join('/')
  const luogoNoto = nellIndice?.classe ?? (relativo.startsWith('..') ? null : relativo.split('/')[0])

  let riferimenti = indice.riferimenti
  let nota = ''
  if (nellIndice) {
    const p = posizione.get(nellIndice.file)
    riferimenti = indice.riferimenti.filter((r) => !(r.classe === nellIndice.classe && Math.abs(posizione.get(r.file) - p) <= vicine))
    nota = `  (è identica a ${nellIndice.file.split('/')[1]}, una foto di riferimento: la tolgo dall'indice con le ${vicine} vicine per lato)`
  }

  const decisione = decidi(punteggi(q, riferimenti), 'vicino')
  const [migliore, secondo] = decisione.classifica
  const margine = secondo ? migliore.punteggio - secondo.punteggio : null

  let verdetto
  if (migliore.punteggio < soglie.nessuno_sotto) verdetto = `✘ Non assomiglia a nessuno dei luoghi che conosco (il più simile è ${nomeBello(migliore.classe)}, ma solo ${formato(migliore.punteggio, 2)})`
  else if (migliore.punteggio < soglie.riconosciuto_da || (margine != null && margine < soglie.margine_minimo)) verdetto = `? Non sono sicuro: assomiglia di più a ${nomeBello(migliore.classe)}`
  else verdetto = `✔ Riconosciuto: ${nomeBello(migliore.classe)}`

  let confronto = ''
  if (luogoNoto && Object.keys(indice.luoghi).includes(luogoNoto)) {
    conLuogoNoto++
    if (migliore.classe === luogoNoto) {
      giuste++
      confronto = `   [giusto: è ${nomeBello(luogoNoto)}]`
    } else confronto = `   [SBAGLIATO: era ${nomeBello(luogoNoto)}]`
  }
  console.log(`\n${path.basename(file)}${nota}`)
  console.log(`  ${verdetto}${confronto}`)
  console.log(`  somiglianza: ${decisione.classifica.map((c) => `${nomeBello(c.classe)} ${formato(c.punteggio)}`).join(' · ')}${margine != null ? ` · margine ${formato(margine)}` : ''}`)
  const piuSimili = riferimenti.map((r) => ({ r, s: somiglianza(q, r.v) })).sort((a, b) => b.s - a.s).slice(0, 3)
  console.log(`  foto più simili tra i riferimenti: ${piuSimili.map(({ r, s }) => `${r.file.split('/')[1].replace('.JPEG', '')} (${nomeBello(r.classe)}) ${formato(s, 2)}`).join(' · ')}`)
}
if (conLuogoNoto > 1) console.log(`\nLuogo giusto: ${giuste} foto su ${conLuogoNoto} (${Math.round((100 * giuste) / conLuogoNoto)}%)`)
