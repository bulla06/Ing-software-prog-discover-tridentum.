// Modulo "Gioco" (Fase 3 §5.3): UC-06 · RF-21…RF-23.
//
// La posizione esatta di un livello non viene mai inviata prima della risposta:
// il server consegna un token "partita" firmato con l'elenco dei livelli,
// verifica ogni risposta e ricalcola il punteggio finale prima di salvarlo.

import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { richiediAccesso } from '../../gateway/autenticazione.js'
import { ErroreHttp, valida } from '../../gateway/errori.js'
import { linguaRichiesta, testo } from '../lingua.js'

export const LIVELLI_PER_PARTITA = 5
export const PUNTEGGIO_MAX = 1000
const DURATA_PARTITA = '3h'
const POSIZIONI_IN_CLASSIFICA = 10
const CARTELLA_FOTO = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../db/dati/foto-gioco')

/** 1000 punti se si centra il luogo; si dimezzano circa ogni 200 m; 0 oltre i 2 km. */
export function punteggio(metri) {
  if (metri > 2000) return 0
  return Math.round(PUNTEGGIO_MAX * Math.exp(-metri / 290))
}

const posizione = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])

// Ogni livello è una foto storica: quelle curate dal team (db/dati/gioco.json) e quelle della
// community che un moderatore ha scelto, con il consenso dell'autore (RF-23). I nomi dei file sono
// neutri (f01.webp) e i crediti, che contengono il nome del luogo, si mandano solo dopo la risposta.
// La posizione giusta è quella dello scatto, se l'autore l'ha indicata, altrimenti quella del luogo.
const LIVELLI = `
  SELECT 'l-' || l.id AS id, l.indizio, l.anno, NULL::uuid AS foto, l.foto_file, l.poi,
         l.foto_autore AS autore, l.foto_licenza AS licenza, l.foto_fonte AS fonte, NULL::geography AS scatto
    FROM livelli_gioco l
   WHERE l.foto_file IS NOT NULL
  UNION ALL
  SELECT 'c-' || c.id, '', c.anno, c.foto, NULL, c.poi, u.nome_visualizzato, c.licenza, '', c.posizione_foto
    FROM contenuti c JOIN utenti u ON u.id = c.autore
   WHERE c.stato = 'approvato' AND c.livello_gioco AND c.foto IS NOT NULL`

/** Indirizzo della foto di un livello, per il tag <img> */
const urlFotoLivello = (l) => (l.foto_file ? `/api/gioco/foto/${l.foto_file}` : `/api/foto/${l.foto}`)

export function rotteGioco({ db, config }) {
  const router = Router()

  async function leggiPartita(token) {
    try {
      const { payload } = await jwtVerify(token, config.jwtSegreto, { algorithms: ['HS256'], audience: 'partita' })
      return payload
    } catch {
      throw new ErroreHttp(400, 'partita_non_valida', 'Partita scaduta o non valida: iniziane una nuova')
    }
  }

  /** Distanza in metri tra la risposta e il punto del livello, calcolata con PostGIS */
  async function valuta(idLivello, [lat, lng], lingua = 'it') {
    const [riga] = await db.query(
      `SELECT p.id, ${testo(lingua, 'p', 'nome')} AS nome,
              ST_Y(coalesce(l.scatto, p.posizione)::geometry) AS lat, ST_X(coalesce(l.scatto, p.posizione)::geometry) AS lng,
              ST_Distance(coalesce(l.scatto, p.posizione), ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) AS metri,
              l.autore, l.licenza, l.fonte
         FROM (${LIVELLI}) l JOIN poi p ON p.id = l.poi
        WHERE l.id = $1`,
      [idLivello, lng, lat],
    )
    // Il livello può essere sparito durante la partita (POI eliminato): vale zero
    if (!riga) return { metri: null, punti: 0, poi: null, credito: null }
    return {
      metri: Math.round(riga.metri),
      punti: punteggio(riga.metri),
      poi: { id: riga.id, nome: riga.nome, posizione: [riga.lat, riga.lng] },
      credito: { autore: riga.autore, licenza: riga.licenza, fonte: riga.fonte || null },
    }
  }

  /** GET /api/gioco/partita — 5 livelli a caso, senza le soluzioni */
  router.get('/gioco/partita', async (req, res) => {
    const livelli = await db.query(`SELECT id, indizio, anno, foto, foto_file FROM (${LIVELLI}) l ORDER BY random() LIMIT $1`, [
      LIVELLI_PER_PARTITA,
    ])
    // E1: servono almeno 5 livelli
    if (livelli.length < LIVELLI_PER_PARTITA) {
      throw new ErroreHttp(409, 'livelli_insufficienti', 'Non ci sono ancora abbastanza luoghi per giocare')
    }
    const partita = await new SignJWT({ livelli: livelli.map((l) => l.id) })
      .setProtectedHeader({ alg: 'HS256' })
      .setJti(randomUUID())
      .setAudience('partita')
      .setExpirationTime(DURATA_PARTITA)
      .sign(config.jwtSegreto)

    res.json({
      partita,
      livelli: livelli.map((l, indice) => ({ indice, anno: l.anno, indizio: l.indizio, foto: l.foto, foto_url: urlFotoLivello(l) })),
    })
  })

  /** GET /api/gioco/foto/:file — foto storiche dei livelli curati dal team */
  router.get('/gioco/foto/:file', (req, res, next) => {
    if (!/^f\d{2}\.webp$/.test(req.params.file)) return next(new ErroreHttp(404, 'non_trovato', 'Foto inesistente'))
    res.sendFile(req.params.file, { root: CARTELLA_FOTO, maxAge: '7d' }, (err) => {
      if (err) next(new ErroreHttp(404, 'non_trovato', 'Foto inesistente'))
    })
  })

  /** POST /api/gioco/verifica — esito di una risposta: posizione reale, distanza e punti */
  router.post('/gioco/verifica', async (req, res) => {
    const dati = valida(
      z.object({ partita: z.string().min(10), indice: z.number().int().min(0).max(LIVELLI_PER_PARTITA - 1), posizione }),
      req.body,
    )
    const { livelli } = await leggiPartita(dati.partita)
    res.json(await valuta(livelli[dati.indice], dati.posizione, linguaRichiesta(req)))
  })

  /** POST /api/gioco/punteggi — salva il punteggio di un utente registrato (RF-22) */
  router.post('/gioco/punteggi', richiediAccesso, async (req, res) => {
    const dati = valida(
      z.object({ partita: z.string().min(10), risposte: z.array(posizione).length(LIVELLI_PER_PARTITA) }),
      req.body,
    )
    const { livelli, jti } = await leggiPartita(dati.partita)

    let totale = 0
    for (const [i, risposta] of dati.risposte.entries()) totale += (await valuta(livelli[i], risposta)).punti

    // L'id della partita è quello del token: la stessa partita non si salva due volte
    const [salvata] = await db.query(
      'INSERT INTO partite (id, utente, punteggio) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING RETURNING id',
      [jti, req.utente.id, totale],
    )
    if (!salvata) throw new ErroreHttp(409, 'partita_gia_salvata', 'Questa partita è già stata salvata')

    res.status(201).json({ punteggio: totale, ...(await posizioneInClassifica(req.utente.id)) })
  })

  async function posizioneInClassifica(idUtente) {
    const [riga] = await db.query(
      `WITH migliori AS (SELECT utente, max(punteggio) AS record FROM partite GROUP BY utente)
       SELECT record, (SELECT count(*)::int + 1 FROM migliori m WHERE m.record > mio.record) AS posizione
         FROM migliori mio WHERE utente = $1`,
      [idUtente],
    )
    return riga ? { record: riga.record, posizione: riga.posizione } : { record: null, posizione: null }
  }

  /** GET /api/gioco/classifica — migliori punteggi e, per chi ha fatto l'accesso, la propria posizione */
  router.get('/gioco/classifica', async (req, res) => {
    const classifica = await db.query(
      `SELECT u.nome_visualizzato AS nome, max(pa.punteggio) AS record
         FROM partite pa JOIN utenti u ON u.id = pa.utente
        GROUP BY u.id
        ORDER BY record DESC, min(pa.giocata_il)
        LIMIT ${POSIZIONI_IN_CLASSIFICA}`,
    )
    res.json({ classifica, mia: req.utente ? await posizioneInClassifica(req.utente.id) : null })
  })

  return router
}
