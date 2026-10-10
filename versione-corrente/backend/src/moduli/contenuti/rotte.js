// Modulo "Contenuti e moderazione" (Fase 3 §5.3): UC-04, UC-05 · RF-14…RF-18 · RNF-S05.

import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { richiediAccesso, richiediRuolo } from '../../gateway/autenticazione.js'
import { ErroreHttp, nonTrovato, valida } from '../../gateway/errori.js'
import { preparaFoto } from '../../servizi/immagini.js'

export const LICENZE = ['cc-by', 'cc-by-nc', 'riservata']
const DIMENSIONE_MASSIMA = 10 * 1024 * 1024
const RUOLI_MODERAZIONE = ['moderatore', 'amministratore']

// La foto resta in memoria il tempo di controllarla e ridurla (RNF-S05: JPEG, PNG o WebP fino a 10 MB)
const caricamento = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DIMENSIONE_MASSIMA, files: 1, fields: 10 },
})

const schemaRicordo = z
  .object({
    testo: z.string().trim().max(2000, 'Massimo 2000 caratteri').default(''),
    anno: z.string().trim().max(30, 'Massimo 30 caratteri').default(''),
    licenza: z.enum(LICENZE, { error: 'Scegli una licenza' }),
    consenso_gioco: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .default(false)
      .transform((v) => v === true || v === 'true'),
    // Dove è stata scattata la foto (facoltativo, RF-23): rende più preciso il livello del gioco
    lat: z.union([z.literal(''), z.coerce.number().min(-90).max(90)]).optional(),
    lng: z.union([z.literal(''), z.coerce.number().min(-180).max(180)]).optional(),
  })

const schemaSegnalazione = z.object({
  motivo: z.enum(['errato', 'inappropriato', 'altro'], { error: 'Scegli un motivo' }),
  nota: z.string().trim().max(500, 'Massimo 500 caratteri').default(''),
})

const schemaDecisione = z
  .object({
    esito: z.enum(['approva', 'rifiuta']),
    motivazione: z.string().trim().max(500).default(''),
    // RF-23: il moderatore decide se la foto diventa un livello di "Dov'era?"
    livello_gioco: z.boolean().default(false),
  })
  .refine((d) => d.esito === 'approva' || d.motivazione.length >= 5, {
    message: 'Spiega all\'autore perché il contenuto è rifiutato',
    path: ['motivazione'],
  })

const ESITO_EMAIL = {
  approva: (nome, poi, _motivazione, livello) => ({
    oggetto: 'Il tuo ricordo è stato pubblicato',
    testo:
      `Ciao ${nome},\n\nil ricordo che hai condiviso su "${poi}" è stato approvato ed è ora visibile nella scheda del luogo.` +
      (livello ? ' La tua foto è diventata anche un livello del gioco "Dov\'era?".' : '') +
      ' Grazie!',
  }),
  rifiuta: (nome, poi, motivazione) => ({
    oggetto: 'Il tuo ricordo non è stato pubblicato',
    testo: `Ciao ${nome},\n\nil ricordo che hai condiviso su "${poi}" non è stato pubblicato.\nMotivazione del moderatore: ${motivazione}\n\nPuoi vederlo nel tuo profilo.`,
  }),
}

export function rotteContenuti({ db, posta, limiti, archivio }) {
  const router = Router()
  const soloModeratori = richiediRuolo(db, ...RUOLI_MODERAZIONE)

  // ---------- Caricare un ricordo (UC-04) ----------

  router.post(
    '/poi/:id/contenuti',
    richiediAccesso,
    limiti.caricamenti,
    caricamento.single('foto'),
    async (req, res) => {
      const dati = valida(schemaRicordo, req.body)
      if (!dati.testo && !req.file) {
        // E2: servono la foto o il testo
        throw new ErroreHttp(400, 'dati_non_validi', 'Aggiungi una foto o scrivi il tuo ricordo', {
          campi: { testo: 'Scrivi il ricordo oppure allega una foto' },
        })
      }
      const [poi] = await db.query('SELECT id FROM poi WHERE id = $1', [req.params.id])
      if (!poi) throw nonTrovato('Luogo')

      let idFoto = null
      if (req.file) {
        const foto = await preparaFoto(req.file.buffer)
        const [riga] = await db.query(
          'INSERT INTO foto (area, larghezza, altezza) VALUES (\'privata\', $1, $2) RETURNING id',
          [foto.larghezza, foto.altezza],
        )
        idFoto = riga.id
        await archivio.salva('privata', idFoto, foto)
      }

      const consenso = Boolean(idFoto) && dati.consenso_gioco
      // La posizione dello scatto serve solo al gioco: si salva solo con il consenso
      const scatto = consenso && typeof dati.lat === 'number' && typeof dati.lng === 'number' ? [dati.lng, dati.lat] : null
      const [contenuto] = await db.query(
        `INSERT INTO contenuti (poi, autore, testo, anno, licenza, foto, consenso_gioco, posizione_foto)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 CASE WHEN $8::float8 IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography END)
         RETURNING id, stato`,
        [poi.id, req.utente.id, dati.testo, dati.anno, dati.licenza, idFoto, consenso, scatto?.[0] ?? null, scatto?.[1] ?? null],
      )
      res.status(201).json(contenuto)
    },
  )

  // ---------- Foto ----------

  /**
   * GET /api/foto/:id?formato=mini|standard
   * Le foto pubbliche le vede chiunque; quelle in attesa solo l'autore e i moderatori.
   */
  router.get('/foto/:id', async (req, res) => {
    const id = valida(z.uuid(), req.params.id)
    const formato = req.query.formato === 'mini' ? 'mini' : 'standard'
    const [foto] = await db.query(
      `SELECT f.area, c.autore FROM foto f LEFT JOIN contenuti c ON c.foto = f.id WHERE f.id = $1`,
      [id],
    )
    if (!foto) throw nonTrovato('Foto')

    if (foto.area === 'privata') {
      if (!req.utente) throw new ErroreHttp(401, 'accesso_richiesto', 'Serve effettuare l\'accesso')
      if (foto.autore !== req.utente.id) {
        const [utente] = await db.query('SELECT ruolo FROM utenti WHERE id = $1', [req.utente.id])
        if (!RUOLI_MODERAZIONE.includes(utente?.ruolo)) throw nonTrovato('Foto')
      }
      res.set('Cache-Control', 'private, no-store')
    } else {
      res.set('Cache-Control', 'public, max-age=86400')
    }
    res.type('image/webp').send(await archivio.leggi(foto.area, id, formato))
  })

  // ---------- Segnalazioni (RF-18) ----------

  router.post('/contenuti/:id/segnalazioni', limiti.segnalazioni, async (req, res) => {
    const id = valida(z.uuid(), req.params.id)
    const dati = valida(schemaSegnalazione, req.body)
    const [contenuto] = await db.query('SELECT id FROM contenuti WHERE id = $1 AND stato = \'approvato\'', [id])
    if (!contenuto) throw nonTrovato('Contenuto')
    await db.query('INSERT INTO segnalazioni (contenuto, motivo, nota) VALUES ($1, $2, $3)', [id, dati.motivo, dati.nota])
    res.status(201).json({ messaggio: 'Segnalazione inviata: un moderatore la verificherà' })
  })

  router.post('/poi/:id/segnalazioni', limiti.segnalazioni, async (req, res) => {
    const dati = valida(schemaSegnalazione, req.body)
    const [poi] = await db.query('SELECT id FROM poi WHERE id = $1', [req.params.id])
    if (!poi) throw nonTrovato('Luogo')
    await db.query('INSERT INTO segnalazioni (poi, motivo, nota) VALUES ($1, $2, $3)', [poi.id, dati.motivo, dati.nota])
    res.status(201).json({ messaggio: 'Segnalazione inviata: un moderatore la verificherà' })
  })

  // ---------- Moderazione (UC-05) ----------

  router.get('/moderazione/coda', soloModeratori, async (req, res) => {
    const [contenuti, segnalazioni] = await Promise.all([
      // Dal più vecchio (passo 2)
      db.query(
        `SELECT c.id, c.testo, c.anno, c.licenza, c.foto, c.consenso_gioco, c.creato_il,
                u.nome_visualizzato AS autore, p.id AS poi_id, p.nome AS poi_nome,
                ST_Y(p.posizione::geometry) AS poi_lat, ST_X(p.posizione::geometry) AS poi_lng,
                ST_Y(c.posizione_foto::geometry) AS scatto_lat, ST_X(c.posizione_foto::geometry) AS scatto_lng
           FROM contenuti c
           JOIN poi p ON p.id = c.poi
           LEFT JOIN utenti u ON u.id = c.autore
          WHERE c.stato = 'in_attesa'
          ORDER BY c.creato_il`,
      ),
      db.query(
        `SELECT s.id, s.motivo, s.nota, s.creata_il,
                c.id AS contenuto_id, c.testo AS contenuto_testo, c.foto AS contenuto_foto,
                coalesce(p.id, pc.id) AS poi_id, coalesce(p.nome, pc.nome) AS poi_nome
           FROM segnalazioni s
           LEFT JOIN contenuti c ON c.id = s.contenuto
           LEFT JOIN poi pc ON pc.id = c.poi
           LEFT JOIN poi p ON p.id = s.poi
          WHERE s.stato = 'aperta'
          ORDER BY s.creata_il`,
      ),
    ])
    res.json({
      contenuti: contenuti.map(({ poi_id, poi_nome, poi_lat, poi_lng, scatto_lat, scatto_lng, ...c }) => ({
        ...c,
        poi: { id: poi_id, nome: poi_nome, posizione: [poi_lat, poi_lng] },
        posizione_foto: scatto_lat == null ? null : [scatto_lat, scatto_lng],
      })),
      segnalazioni: segnalazioni.map((s) => ({
        id: s.id,
        motivo: s.motivo,
        nota: s.nota,
        creata_il: s.creata_il,
        poi: { id: s.poi_id, nome: s.poi_nome },
        contenuto: s.contenuto_id ? { id: s.contenuto_id, testo: s.contenuto_testo, foto: s.contenuto_foto } : null,
      })),
    })
  })

  router.post('/moderazione/contenuti/:id/decisione', soloModeratori, async (req, res) => {
    const id = valida(z.uuid(), req.params.id)
    const dati = valida(schemaDecisione, req.body)
    const approva = dati.esito === 'approva'
    const livello = approva && dati.livello_gioco

    // E1: vale la prima decisione salvata. L'aggiornamento riesce solo se il contenuto è ancora in attesa.
    // Una foto diventa un livello del gioco solo se l'autore ha dato il consenso.
    const [contenuto] = await db.query(
      `UPDATE contenuti SET stato = $2, motivazione = $3, moderato_da = $4, moderato_il = now(), livello_gioco = $5
        WHERE id = $1 AND stato = 'in_attesa' AND (NOT $5 OR (consenso_gioco AND foto IS NOT NULL))
        RETURNING id, foto, poi, autore`,
      [id, approva ? 'approvato' : 'rifiutato', approva ? null : dati.motivazione, req.utente.id, livello],
    )
    if (!contenuto) {
      const [esiste] = await db.query('SELECT stato, consenso_gioco, foto FROM contenuti WHERE id = $1', [id])
      if (!esiste) throw nonTrovato('Contenuto')
      if (esiste.stato === 'in_attesa') {
        throw new ErroreHttp(400, 'senza_consenso', 'L\'autore non ha dato il consenso a usare la foto nel gioco')
      }
      throw new ErroreHttp(409, 'gia_moderato', 'Un altro moderatore ha già deciso su questo contenuto')
    }

    // All'approvazione la foto passa nell'area pubblica (RF-16)
    if (approva && contenuto.foto) {
      await archivio.sposta(contenuto.foto, 'privata', 'pubblica')
      await db.query('UPDATE foto SET area = \'pubblica\' WHERE id = $1', [contenuto.foto])
    }

    const [info] = await db.query(
      `SELECT u.email, u.nome_visualizzato, p.nome AS poi FROM contenuti c
         JOIN poi p ON p.id = c.poi LEFT JOIN utenti u ON u.id = c.autore WHERE c.id = $1`,
      [id],
    )
    if (info?.email) {
      const messaggio = ESITO_EMAIL[dati.esito](info.nome_visualizzato, info.poi, dati.motivazione, livello)
      await posta.inviaSenzaBloccare({ a: info.email, ...messaggio })
    }
    res.json({ id, stato: approva ? 'approvato' : 'rifiutato', livello_gioco: livello })
  })

  // 1a: decisione su una segnalazione. "rimuovi" toglie il ricordo dalla scheda;
  // per un POI la correzione la fa un amministratore e la segnalazione si chiude.
  router.post('/moderazione/segnalazioni/:id/decisione', soloModeratori, async (req, res) => {
    const id = valida(z.uuid(), req.params.id)
    const { esito } = valida(z.object({ esito: z.enum(['mantieni', 'rimuovi']) }), req.body)

    const [segnalazione] = await db.query(
      'UPDATE segnalazioni SET stato = \'chiusa\', esito = $2 WHERE id = $1 AND stato = \'aperta\' RETURNING contenuto',
      [id, esito],
    )
    if (!segnalazione) {
      const [esiste] = await db.query('SELECT 1 FROM segnalazioni WHERE id = $1', [id])
      if (!esiste) throw nonTrovato('Segnalazione')
      throw new ErroreHttp(409, 'gia_moderato', 'Questa segnalazione è già stata gestita')
    }

    if (esito === 'rimuovi' && segnalazione.contenuto) {
      const [contenuto] = await db.query(
        `UPDATE contenuti SET stato = 'rimosso', moderato_da = $2, moderato_il = now()
          WHERE id = $1 AND stato = 'approvato' RETURNING foto`,
        [segnalazione.contenuto, req.utente.id],
      )
      if (contenuto?.foto) {
        await archivio.sposta(contenuto.foto, 'pubblica', 'privata')
        await db.query('UPDATE foto SET area = \'privata\' WHERE id = $1', [contenuto.foto])
      }
      // Le altre segnalazioni sullo stesso ricordo non servono più
      await db.query(
        'UPDATE segnalazioni SET stato = \'chiusa\', esito = \'rimuovi\' WHERE contenuto = $1 AND stato = \'aperta\'',
        [segnalazione.contenuto],
      )
    }
    res.json({ id, esito })
  })

  return router
}
