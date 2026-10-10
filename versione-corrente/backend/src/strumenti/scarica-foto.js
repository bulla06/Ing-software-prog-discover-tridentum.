// Scarica da Wikimedia Commons le foto dei luoghi elencate in db/dati/foto-da-scaricare.json
// e le mette in un nuovo pacchetto di dati (es. db/dati/004-foto-dei-luoghi), con autore, licenza
// e fonte presi da Commons. Al successivo avvio del server il pacchetto si carica nel database.
//
//   npm run scarica-foto                 (dalla cartella principale)
//   npm run scarica-foto -- --prova      solo l'elenco di quello che verrebbe scaricato
//
// Serve una connessione che raggiunga commons.wikimedia.org e upload.wikimedia.org.
// Si saltano i luoghi che hanno già una foto in un pacchetto. Le foto scelte da una categoria o da
// una ricerca vanno guardate prima del commit: lo script lo ricorda alla fine.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARTELLA_DATI, elencaPacchetti, leggiPacchetto } from '../db/popola.js'

const API = 'https://commons.wikimedia.org/w/api.php'
const LARGHEZZA = 1600
// Wikimedia chiede un User-Agent che dica chi fa le richieste
const USER_AGENT = 'DiscoverTridentum/1.0 (progetto universitario; https://github.com/bulla06/Ing-software-prog-test-v1)'
const FORMATI = ['image/jpeg', 'image/png', 'image/webp']
// Commons accetta solo licenze libere; si escludono comunque i file senza licenza dichiarata
const LICENZA_LIBERA = /^(cc[ -]by|cc0|public domain|pd\b|pd-|attribution)/i

/** Testo senza tag HTML (Commons restituisce autore e descrizione in HTML) */
export const testoSemplice = (html = '') =>
  String(html).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

async function chiedi(fetchFn, parametri) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...parametri })}`
  const risposta = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!risposta.ok) throw new Error(`Commons ha risposto ${risposta.status}`)
  return risposta.json()
}

/** Titoli dei file candidati per una voce: il file indicato, quelli della categoria o quelli della ricerca */
async function candidati(fetchFn, voce) {
  if (voce.file) return [`File:${voce.file}`]
  if (voce.categoria) {
    const dati = await chiedi(fetchFn, {
      action: 'query', list: 'categorymembers', cmtitle: `Category:${voce.categoria}`, cmtype: 'file', cmlimit: '20',
    })
    return (dati.query?.categorymembers ?? []).map((m) => m.title)
  }
  const dati = await chiedi(fetchFn, { action: 'query', list: 'search', srsearch: voce.ricerca, srnamespace: '6', srlimit: '10' })
  return (dati.query?.search ?? []).map((m) => m.title)
}

/** Informazioni e crediti di un file di Commons, oppure null se il formato o la licenza non vanno bene */
async function informazioni(fetchFn, titolo) {
  const dati = await chiedi(fetchFn, {
    action: 'query', titles: titolo, prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: String(LARGHEZZA),
  })
  const info = dati.query?.pages?.[0]?.imageinfo?.[0]
  if (!info || !FORMATI.includes(info.mime)) return null
  const meta = info.extmetadata ?? {}
  const licenza = testoSemplice(meta.LicenseShortName?.value)
  if (!LICENZA_LIBERA.test(licenza)) return null
  return {
    url: info.thumburl ?? info.url,
    autore: testoSemplice(meta.Artist?.value) || 'Autore sconosciuto',
    licenza,
    url_licenza: meta.LicenseUrl?.value || null,
    fonte: info.descriptionurl,
    didascalia: testoSemplice(meta.ImageDescription?.value).slice(0, 300),
  }
}

/** Numero e nome del nuovo pacchetto: il primo numero libero dopo quelli esistenti */
async function nuovoPacchetto(cartellaDati) {
  const esistenti = await elencaPacchetti(cartellaDati)
  const ultimo = Math.max(0, ...esistenti.map((n) => Number(n.slice(0, 3))))
  return `${String(ultimo + 1).padStart(3, '0')}-foto-dei-luoghi`
}

/**
 * Scarica le foto e crea il pacchetto. Restituisce il resoconto.
 * `fetchFn` e `cartellaDati` si possono sostituire nei test.
 */
export async function scaricaFoto({ fetchFn = fetch, cartellaDati = CARTELLA_DATI, prova = false, registro = console } = {}) {
  const elenco = JSON.parse(await readFile(path.join(cartellaDati, 'foto-da-scaricare.json'), 'utf8'))
  const conFoto = new Set()
  for (const nome of await elencaPacchetti(cartellaDati)) for (const f of (await leggiPacchetto(nome, cartellaDati)).foto) conFoto.add(f.poi)

  const esito = { pacchetto: null, scaricate: [], saltate: [], nonTrovate: [], daControllare: [] }
  const foto = []
  const nome = await nuovoPacchetto(cartellaDati)
  const cartella = path.join(cartellaDati, nome)

  for (const voce of elenco) {
    if (conFoto.has(voce.poi)) {
      esito.saltate.push(voce.poi)
      continue
    }
    let scelta = null
    let titolo = null
    try {
      for (titolo of await candidati(fetchFn, voce)) {
        scelta = await informazioni(fetchFn, titolo)
        if (scelta) break
      }
    } catch (errore) {
      registro.warn(`${voce.poi}: ${errore.message}`)
    }
    if (!scelta) {
      esito.nonTrovate.push(voce.poi)
      continue
    }
    const file = `${voce.poi}${path.extname(new URL(scelta.url).pathname).toLowerCase() || '.jpg'}`
    registro.log(`${voce.poi} ← ${titolo} (${scelta.licenza}, ${scelta.autore})`)
    if (!voce.file) esito.daControllare.push(voce.poi)
    if (prova) {
      esito.scaricate.push(voce.poi)
      continue
    }
    const risposta = await fetchFn(scelta.url, { headers: { 'User-Agent': USER_AGENT } })
    if (!risposta.ok) {
      esito.nonTrovate.push(voce.poi)
      continue
    }
    await mkdir(path.join(cartella, 'foto'), { recursive: true })
    await writeFile(path.join(cartella, 'foto', file), Buffer.from(await risposta.arrayBuffer()))
    const { url: _url, ...crediti } = scelta
    foto.push({ poi: voce.poi, file, ...crediti })
    esito.scaricate.push(voce.poi)
  }

  if (!prova && foto.length) {
    await writeFile(path.join(cartella, 'foto.json'), `${JSON.stringify(foto, null, 2)}\n`)
    esito.pacchetto = nome
  }
  return esito
}

// Uso da riga di comando
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const prova = process.argv.includes('--prova')
  const esito = await scaricaFoto({ prova })
  console.log(`\nScaricate: ${esito.scaricate.length} · già con foto: ${esito.saltate.length} · non trovate: ${esito.nonTrovate.length}`)
  if (esito.nonTrovate.length) console.log(`Senza foto: ${esito.nonTrovate.join(', ')}`)
  if (esito.pacchetto) {
    console.log(`\nNuovo pacchetto: db/dati/${esito.pacchetto}. Si carica al prossimo avvio del server.`)
    if (esito.daControllare.length) {
      console.log(`Prima del commit guarda le foto scelte da categoria o ricerca: ${esito.daControllare.join(', ')}`)
    }
  }
}
