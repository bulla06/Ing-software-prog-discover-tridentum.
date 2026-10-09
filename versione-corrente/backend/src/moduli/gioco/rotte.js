// Modulo "Gioco" (Fase 3 §5.3): UC-06 · RF-21…RF-23.
//
// La posizione esatta di un livello non viene mai inviata prima della risposta:
// il server consegna un token "partita" firmato con l'elenco dei livelli,
// verifica ogni risposta e ricalcola il punteggio finale prima di salvarlo.

import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { richiediAccesso } from '../../gateway/autenticazione.js'
import { ErroreHttp, valida } from '../../gateway/errori.js'

export const LIVELLI_PER_PARTITA = 5
export const PUNTEGGIO_MAX = 1000
const DURATA_PARTITA = '3h'
const POSIZIONI_IN_CLASSIFICA = 10

/** 1000 punti se si centra il luogo; si dimezzano circa ogni 200 m; 0 oltre i 2 km. */
export function punteggio(metri) {
  if (metri > 2000) return 0
  return Math.round(PUNTEGGIO_MAX * Math.exp(-metri / 290))
}

const posizione = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])

// Livelli curati dal team e foto della community approvate con il consenso dell'autore (RF-23)
const LIVELLI = `
  SELECT 'l-' || l.id AS id, l.indizio, l.anno, NULL::uuid AS foto, l.poi
    FROM livelli_gioco l
  UNION ALL
  SELECT 'c-' || c.id, '', c.anno, c.foto, c.poi
    FROM contenuti c
   WHERE c.stato = 'approvato' AND c.consenso_gioco AND c.foto IS NOT NULL`

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

  /** Distanza in metri tra la risposta e il POI del livello, calcolata con PostGIS */
  async function valuta(idLivello, [lat, lng]) {
    const [riga] = await db.query(
      `SELECT p.id, p.nome, ST_Y(p.posizione::geometry) AS lat, ST_X(p.posizione::geometry) AS lng,
              ST_Distance(p.posizione, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) AS metri
         FROM (${LIVELLI}) l JOIN poi p ON p.id = l.poi
        WHERE l.id = $1`,
      [idLivello, lng, lat],
    )
    // Il livello può essere sparito durante la partita (POI eliminato): vale zero
    if (!riga) return { metri: null, punti: 0, poi: null }
    return {
      metri: Math.round(riga.metri),
      punti: punteggio(riga.metri),
      poi: { id: riga.id, nome: riga.nome, posizione: [riga.lat, riga.lng] },
    }
  }

  /** GET /api/gioco/partita — 5 livelli a caso, senza le soluzioni */
  router.get('/gioco/partita', async (req, res) => {
    const livelli = await db.query(`SELECT id, indizio, anno, foto FROM (${LIVELLI}) l ORDER BY random() LIMIT $1`, [
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

    res.json({ partita, livelli: livelli.map(({ id, ...l }, indice) => ({ indice, ...l })) })
  })

  /** POST /api/gioco/verifica — esito di una risposta: posizione reale, distanza e punti */
  router.post('/gioco/verifica', async (req, res) => {
    const dati = valida(
      z.object({ partita: z.string().min(10), indice: z.number().int().min(0).max(LIVELLI_PER_PARTITA - 1), posizione }),
      req.body,
    )
    const { livelli } = await leggiPartita(dati.partita)
    res.json(await valuta(livelli[dati.indice], dati.posizione))
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
