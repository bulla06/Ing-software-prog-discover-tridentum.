// "Addestramento" del test 0.1.
// Con DINOv2 non si cambiano i pesi del modello: si calcola l'impronta di ogni foto di riferimento
// e si salva l'indice (foto di ogni luogo con le loro impronte e il vettore medio del luogo).
// Poi prova.mjs confronta una foto nuova con quelle dell'indice.
//
// Uso:  node costruisci-indice.mjs [--dtype int8|fp32] [--variante cls|media|cls_media]

import fs from 'node:fs'
import path from 'node:path'
import { CARTELLA, DESCRIZIONE_VARIANTI, NOME_MODELLO, VARIANTI, assicuraImpronte, elencaFoto, prototipo } from './lib.mjs'
import { aBlocchi, preparaVoci, soglieDa } from './protocolli.mjs'

const args = process.argv.slice(2)
const opzione = (nome, predefinito) => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : predefinito
}
const dtype = opzione('--dtype', 'int8')
const variante = opzione('--variante', 'cls')
if (!['fp32', 'int8'].includes(dtype)) throw new Error('--dtype deve essere fp32 oppure int8')
if (!VARIANTI.includes(variante)) throw new Error(`--variante deve essere una tra: ${VARIANTI.join(', ')}`)

const foto = elencaFoto()
if (!foto.length) {
  console.error('Non ci sono foto: mettile in foto/<nome-luogo>/ (una cartella per luogo).')
  process.exit(1)
}
const luoghi = [...new Set(foto.map((f) => f.classe))]
console.log(`Foto: ${foto.length}, in ${luoghi.length} luoghi: ${luoghi.map((c) => `${c} (${foto.filter((f) => f.classe === c).length})`).join(', ')}`)

const impronte = await assicuraImpronte(dtype, foto)

const indice = {
  versione: 1,
  creato_il: new Date().toISOString(),
  modello: NOME_MODELLO,
  dtype,
  variante,
  descrizione_variante: DESCRIZIONE_VARIANTI[variante],
  dimensione: impronte[foto[0].relativo][variante].length,
  // Soglie per "riconosciuto / non sono sicuro / non assomiglia a nessuno", calibrate con la prova a blocchi
  soglie: soglieDa(aBlocchi(preparaVoci(foto, impronte, variante).voci, luoghi)),
  luoghi: Object.fromEntries(
    luoghi.map((c) => {
      const fotoLuogo = foto.filter((f) => f.classe === c)
      return [c, { foto: fotoLuogo.length, prototipo: prototipo(fotoLuogo.map((f) => impronte[f.relativo][variante])) }]
    }),
  ),
  riferimenti: foto.map((f) => ({ file: f.relativo, classe: f.classe, v: impronte[f.relativo][variante] })),
}

const destinazione = path.join(CARTELLA, 'indice.json')
fs.writeFileSync(destinazione, JSON.stringify(indice))
console.log(`Indice salvato in indice.json (${(fs.statSync(destinazione).size / 1024).toFixed(0)} KB): modello ${dtype}, ${DESCRIZIONE_VARIANTI[variante]}.`)
console.log('Ora si può provare una foto con:  node prova.mjs <foto>   oppure valutare tutto con:  node valuta.mjs')
