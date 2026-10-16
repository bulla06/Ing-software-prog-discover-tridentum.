// Funzioni in comune del test 0.1: modello DINOv2 small, impronte delle foto e confronto.
// L'"impronta" (embedding) di una foto è un vettore di numeri: foto simili hanno impronte vicine.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { AutoModel, AutoProcessor, RawImage, env } from '@huggingface/transformers'

export const CARTELLA = path.dirname(fileURLToPath(import.meta.url))
export const CARTELLA_FOTO = path.join(CARTELLA, 'foto')
export const CARTELLA_CACHE = path.join(CARTELLA, 'cache')
export const CARTELLA_RISULTATI = path.join(CARTELLA, 'risultati')
export const NOME_MODELLO = 'onnx-community/dinov2-small'

// Il modello (88 MB in precisione piena, 24 MB a 8 bit) si scarica la prima volta e resta qui
env.cacheDir = path.join(CARTELLA, 'modelli')

/** Come si riduce l'uscita del modello (257 vettori da 384 numeri) a un'unica impronta */
export const VARIANTI = ['cls', 'media', 'cls_media']
export const DESCRIZIONE_VARIANTI = {
  cls: 'token CLS (384 numeri)',
  media: 'media delle patch (384 numeri)',
  cls_media: 'CLS + media delle patch (768 numeri)',
}

const ESTENSIONI = /\.(jpe?g|png|webp)$/i
const numeroNelNome = (nome) => Number(nome.match(/\d+/)?.[0] ?? 0)

/** Foto in foto/<luogo>/: il nome della cartella è la classe (il luogo). Ordinate per classe e numero. */
export function elencaFoto(radice = CARTELLA_FOTO) {
  const foto = []
  if (!fs.existsSync(radice)) return foto
  for (const voce of fs.readdirSync(radice, { withFileTypes: true })) {
    if (!voce.isDirectory()) continue
    for (const nome of fs.readdirSync(path.join(radice, voce.name))) {
      if (ESTENSIONI.test(nome)) foto.push({ classe: voce.name, nome, percorso: path.join(radice, voce.name, nome), relativo: `${voce.name}/${nome}` })
    }
  }
  return foto.sort((a, b) => a.classe.localeCompare(b.classe) || numeroNelNome(a.nome) - numeroNelNome(b.nome) || a.nome.localeCompare(b.nome))
}

// ---------- Vettori ----------

export function normalizza(v) {
  let somma = 0
  for (const x of v) somma += x * x
  const norma = Math.sqrt(somma) || 1
  return v.map((x) => x / norma)
}

/** Somiglianza del coseno: con vettori già normalizzati è il prodotto scalare (1 = identici, 0 = niente in comune) */
export function somiglianza(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** Vettore medio di un gruppo di impronte (il "prototipo" del luogo) */
export function prototipo(vettori) {
  const m = new Array(vettori[0].length).fill(0)
  for (const v of vettori) for (let i = 0; i < m.length; i++) m[i] += v[i]
  return normalizza(m)
}

const arrotonda = (v) => v.map((x) => Math.round(x * 1e6) / 1e6)

/**
 * Punteggi di una foto rispetto alle foto di riferimento, per ogni luogo:
 * - vicino: somiglianza con la foto più simile di quel luogo
 * - prototipo: somiglianza con il vettore medio di quel luogo
 */
export function punteggi(query, riferimenti) {
  const perClasse = new Map()
  for (const r of riferimenti) {
    if (!perClasse.has(r.classe)) perClasse.set(r.classe, [])
    perClasse.get(r.classe).push(r.v)
  }
  return [...perClasse].map(([classe, vettori]) => ({
    classe,
    vicino: Math.max(...vettori.map((v) => somiglianza(query, v))),
    prototipo: somiglianza(query, prototipo(vettori)),
  }))
}

/** Sceglie il luogo con il punteggio più alto; il margine è la distanza dal secondo (più è alto, più è netta la scelta) */
export function decidi(classi, metodo = 'vicino') {
  const ordinate = [...classi].sort((a, b) => b[metodo] - a[metodo])
  return {
    classe: ordinate[0].classe,
    punteggio: ordinate[0][metodo],
    margine: ordinate.length > 1 ? ordinate[0][metodo] - ordinate[1][metodo] : null,
    classifica: ordinate.map((c) => ({ classe: c.classe, punteggio: c[metodo] })),
  }
}

// ---------- Modello ----------

/** Carica DINOv2 small (precisione 'fp32' oppure 'int8', cioè numeri a 8 bit, più leggero) */
export async function caricaModello(dtype = 'fp32') {
  const t0 = performance.now()
  let ultimo = -10
  const progress_callback = (p) => {
    if (p?.status === 'progress' && p.total > 5e6) {
      const pct = Math.floor(p.progress)
      // Il messaggio compare solo se il file si sta davvero scaricando (dalla cache arriva subito al 100%)
      if (pct >= ultimo + 10 && (pct < 100 || ultimo >= 0)) {
        ultimo = pct
        process.stdout.write(`\r  scarico ${path.basename(p.file)} (${(p.total / 1e6).toFixed(1)} MB): ${pct}%   `)
      }
    } else if (p?.status === 'done' && String(p.file).endsWith('.onnx') && ultimo >= 0) {
      process.stdout.write('\n')
    }
  }
  const processore = await AutoProcessor.from_pretrained(NOME_MODELLO)
  const modello = await AutoModel.from_pretrained(NOME_MODELLO, { dtype, progress_callback })
  return { processore, modello, dtype, ms: Math.round(performance.now() - t0) }
}

/**
 * Impronta di una foto: legge il file (con la rotazione giusta), la riduce a 224 x 224 come vuole il
 * modello (lato corto a 256 pixel e ritaglio al centro) e prende l'uscita del modello nelle tre varianti.
 */
export async function improntaDi({ processore, modello }, percorso) {
  const { data, info } = await sharp(percorso).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const immagine = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3)
  const ingressi = await processore(immagine)
  const t = performance.now()
  const { last_hidden_state } = await modello(ingressi)
  const ms = Math.round(performance.now() - t)
  const [, token, dim] = last_hidden_state.dims
  const v = last_hidden_state.data
  const cls = Array.from(v.subarray(0, dim))
  const media = new Array(dim).fill(0)
  for (let k = 1; k < token; k++) {
    const base = k * dim
    for (let d = 0; d < dim; d++) media[d] += v[base + d]
  }
  for (let d = 0; d < dim; d++) media[d] /= token - 1
  const c = normalizza(cls)
  const m = normalizza(media)
  return { cls: arrotonda(c), media: arrotonda(m), cls_media: arrotonda(normalizza([...c, ...m])), ms }
}

/**
 * Impronte di un elenco di foto, con una cache su disco (cache/impronte-<dtype>.json):
 * si calcolano solo quelle nuove o cambiate. Restituisce { relativo: { cls, media, cls_media, ms } }.
 */
export async function assicuraImpronte(dtype, foto, { caricato = null, log = console.log } = {}) {
  fs.mkdirSync(CARTELLA_CACHE, { recursive: true })
  const file = path.join(CARTELLA_CACHE, `impronte-${dtype}.json`)
  const cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
  const daFare = foto.filter((f) => cache[f.relativo]?.dimensione !== fs.statSync(f.percorso).size)
  if (daFare.length) {
    caricato ??= await caricaModello(dtype)
    log(`  modello ${dtype} pronto in ${caricato.ms} ms; calcolo le impronte di ${daFare.length} foto`)
    let fatte = 0
    for (const f of daFare) {
      const r = await improntaDi(caricato, f.percorso)
      cache[f.relativo] = { dimensione: fs.statSync(f.percorso).size, ...r }
      if (++fatte % 12 === 0 || fatte === daFare.length) log(`    ${fatte}/${daFare.length}`)
    }
    fs.writeFileSync(file, JSON.stringify(cache))
  }
  return Object.fromEntries(foto.map((f) => [f.relativo, cache[f.relativo]]))
}

export const percentuale = (parte, totale) => (totale ? Math.round((1000 * parte) / totale) / 10 : null)
export const formato = (x, cifre = 3) => (x == null ? '-' : x.toFixed(cifre).replace('.', ','))
export const mediana = (valori) => {
  const v = [...valori].sort((a, b) => a - b)
  return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null
}
