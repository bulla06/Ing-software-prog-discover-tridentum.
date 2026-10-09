// Modulo "Utenti e accessi" (Fase 3 §5.3): UC-03, UC-08, UC-09 · RF-09…RF-13, RF-25.

import { Router } from 'express'
import { z } from 'zod'
import {
  COOKIE_RINNOVO,
  DURATA_RINNOVO_MS,
  creaTokenAccesso,
  hashToken,
  nuovoTokenCasuale,
  richiediAccesso,
  richiediRuolo,
} from '../../gateway/autenticazione.js'
import { ErroreHttp, nonTrovato, valida } from '../../gateway/errori.js'
import { hashPassword, verificaPassword } from '../../servizi/password.js'

const DURATA_CONFERMA_MS = 24 * 60 * 60 * 1000
const DURATA_REIMPOSTA_MS = 60 * 60 * 1000

// Spazi e maiuscole si tolgono prima di controllare l'indirizzo
const email = z.string({ error: 'Inserisci l\'e-mail' }).trim().toLowerCase().max(200).pipe(z.email('Indirizzo e-mail non valido'))
const password = z
  .string()
  .min(8, 'La password deve avere almeno 8 caratteri')
  .max(200, 'Password troppo lunga')
  .regex(/[A-Za-z]/, 'La password deve contenere almeno una lettera')
  .regex(/[0-9]/, 'La password deve contenere almeno un numero')

const schemaRegistrazione = z.object({
  nome: z.string().trim().min(2, 'Il nome deve avere almeno 2 caratteri').max(40, 'Massimo 40 caratteri'),
  email,
  password,
  privacy: z.literal(true, { error: 'Per registrarti devi accettare l\'informativa privacy' }),
})

const schemaAccesso = z.object({ email, password: z.string().min(1, 'Inserisci la password') })
const schemaToken = z.object({ token: z.string().min(10).max(200) })

export function rotteUtenti({ db, config, posta, limiti, archivio }) {
  const router = Router()

  // ---------- Funzioni di supporto ----------

  const datiPubblici = (u) => ({ id: u.id, nome: u.nome_visualizzato, email: u.email, ruolo: u.ruolo })

  async function creaTokenMonouso(utente, tipo, durataMs) {
    await db.query('DELETE FROM token_utente WHERE utente = $1 AND tipo = $2', [utente, tipo])
    const token = nuovoTokenCasuale()
    await db.query(
      'INSERT INTO token_utente (hash, utente, tipo, scade_il) VALUES ($1, $2, $3, $4)',
      [hashToken(token), utente, tipo, new Date(Date.now() + durataMs)],
    )
    return token
  }

  /** Consuma un token monouso: lo elimina e restituisce l'utente, oppure null se non valido o scaduto. */
  async function usaToken(token, tipo) {
    const [riga] = await db.query(
      'DELETE FROM token_utente WHERE hash = $1 AND tipo = $2 RETURNING utente, scade_il',
      [hashToken(token), tipo],
    )
    if (!riga) return { stato: 'non_valido' }
    if (riga.scade_il < new Date()) return { stato: 'scaduto', utente: riga.utente }
    return { stato: 'valido', utente: riga.utente }
  }

  /** Apre una sessione: token di accesso nella risposta, token di rinnovo nel cookie. */
  async function apriSessione(res, utente) {
    const rinnovo = await creaTokenRinnovo(utente.id)
    impostaCookie(res, rinnovo)
    return { token: await creaTokenAccesso(utente, config.jwtSegreto), utente: datiPubblici(utente) }
  }

  async function creaTokenRinnovo(idUtente) {
    const token = nuovoTokenCasuale()
    await db.query(
      'INSERT INTO token_utente (hash, utente, tipo, scade_il) VALUES ($1, $2, \'rinnovo\', $3)',
      [hashToken(token), idUtente, new Date(Date.now() + DURATA_RINNOVO_MS)],
    )
    return token
  }

  function impostaCookie(res, token) {
    res.cookie(COOKIE_RINNOVO, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.https,
      path: '/api/auth',
      maxAge: DURATA_RINNOVO_MS,
    })
  }

  const cancellaCookie = (res) => res.clearCookie(COOKIE_RINNOVO, { path: '/api/auth' })

  const link = (percorso, token) => `${config.indirizzoPubblico}/#/${percorso}?token=${encodeURIComponent(token)}`

  async function inviaConferma(utente) {
    const token = await creaTokenMonouso(utente.id, 'conferma', DURATA_CONFERMA_MS)
    await posta.inviaSenzaBloccare({
      a: utente.email,
      oggetto: 'Conferma il tuo account Discover Tridentum',
      testo:
        `Ciao ${utente.nome_visualizzato},\n\n` +
        `per attivare il tuo account apri questo link entro 24 ore:\n${link('conferma', token)}\n\n` +
        'Se non ti sei registrato tu, ignora questo messaggio.',
    })
  }

  // ---------- Registrazione e accesso (UC-03) ----------

  router.post('/auth/registrazione', limiti.registrazione, async (req, res) => {
    const dati = valida(schemaRegistrazione, req.body)
    const [esistente] = await db.query('SELECT 1 FROM utenti WHERE email = $1', [dati.email])
    if (esistente) {
      // E1: e-mail già registrata → si propone di accedere o reimpostare la password
      throw new ErroreHttp(409, 'email_registrata', 'Questa e-mail è già registrata: accedi o reimposta la password')
    }
    const [utente] = await db.query(
      `INSERT INTO utenti (nome_visualizzato, email, hash_password, consenso_privacy_il)
       VALUES ($1, $2, $3, now()) RETURNING *`,
      [dati.nome, dati.email, await hashPassword(dati.password)],
    )
    await inviaConferma(utente)
    res.status(201).json({ messaggio: 'Ti abbiamo inviato un\'e-mail: apri il link per attivare l\'account' })
  })

  router.post('/auth/conferma', async (req, res) => {
    const { token } = valida(schemaToken, req.body)
    const esito = await usaToken(token, 'conferma')
    if (esito.stato === 'scaduto') {
      throw new ErroreHttp(410, 'link_scaduto', 'Il link è scaduto: chiedine uno nuovo')
    }
    if (esito.stato !== 'valido') throw new ErroreHttp(400, 'link_non_valido', 'Il link non è valido o è già stato usato')
    const [utente] = await db.query('UPDATE utenti SET email_confermata = true WHERE id = $1 RETURNING *', [esito.utente])
    if (!utente) throw new ErroreHttp(400, 'link_non_valido', 'Account non trovato')
    res.json(await apriSessione(res, utente))
  })

  // E4: nuovo link di conferma. La risposta è sempre la stessa, per non rivelare quali e-mail sono registrate.
  router.post('/auth/conferma/nuovo', limiti.registrazione, async (req, res) => {
    const { email: indirizzo } = valida(z.object({ email }), req.body)
    const [utente] = await db.query('SELECT * FROM utenti WHERE email = $1 AND NOT email_confermata', [indirizzo])
    if (utente) await inviaConferma(utente)
    res.json({ messaggio: 'Se l\'account esiste e non è ancora attivo, riceverai un nuovo link' })
  })

  router.post('/auth/accesso', limiti.accesso, async (req, res) => {
    const dati = valida(schemaAccesso, req.body)
    const [utente] = await db.query('SELECT * FROM utenti WHERE email = $1', [dati.email])
    if (!utente || !(await verificaPassword(dati.password, utente.hash_password))) {
      throw new ErroreHttp(401, 'credenziali_errate', 'E-mail o password non corrette')
    }
    if (!utente.email_confermata) {
      throw new ErroreHttp(403, 'email_non_confermata', 'Conferma l\'e-mail prima di accedere: controlla la posta')
    }
    res.json(await apriSessione(res, utente))
  })

  // Nuovo token di accesso dal cookie di rinnovo, che a ogni uso viene sostituito
  router.post('/auth/rinnovo', async (req, res) => {
    const token = req.cookies?.[COOKIE_RINNOVO]
    // Visitatore senza sessione: nessun errore, semplicemente nessun utente
    if (!token) return res.status(204).end()
    const esito = await usaToken(token, 'rinnovo')
    if (esito.stato !== 'valido') {
      cancellaCookie(res)
      throw new ErroreHttp(401, 'sessione_scaduta', 'Sessione scaduta: accedi di nuovo')
    }
    const [utente] = await db.query('SELECT * FROM utenti WHERE id = $1', [esito.utente])
    if (!utente) {
      cancellaCookie(res)
      throw new ErroreHttp(401, 'sessione_scaduta', 'Sessione scaduta: accedi di nuovo')
    }
    res.json(await apriSessione(res, utente))
  })

  router.post('/auth/uscita', async (req, res) => {
    const token = req.cookies?.[COOKIE_RINNOVO]
    if (token) await db.query('DELETE FROM token_utente WHERE hash = $1', [hashToken(token)])
    cancellaCookie(res)
    res.status(204).end()
  })

  // 1b: password dimenticata. Anche qui la risposta non dice se l'e-mail esiste.
  router.post('/auth/password-dimenticata', limiti.registrazione, async (req, res) => {
    const { email: indirizzo } = valida(z.object({ email }), req.body)
    const [utente] = await db.query('SELECT * FROM utenti WHERE email = $1', [indirizzo])
    if (utente) {
      const token = await creaTokenMonouso(utente.id, 'reimposta', DURATA_REIMPOSTA_MS)
      await posta.inviaSenzaBloccare({
        a: utente.email,
        oggetto: 'Reimposta la password di Discover Tridentum',
        testo:
          `Ciao ${utente.nome_visualizzato},\n\n` +
          `per scegliere una nuova password apri questo link entro un'ora:\n${link('reimposta', token)}\n\n` +
          'Se non l\'hai chiesto tu, ignora questo messaggio: la password resta quella di prima.',
      })
    }
    res.json({ messaggio: 'Se l\'e-mail è registrata, riceverai un link per reimpostare la password' })
  })

  router.post('/auth/reimposta', async (req, res) => {
    const dati = valida(schemaToken.extend({ password }), req.body)
    const esito = await usaToken(dati.token, 'reimposta')
    if (esito.stato === 'scaduto') throw new ErroreHttp(410, 'link_scaduto', 'Il link è scaduto: chiedine uno nuovo')
    if (esito.stato !== 'valido') throw new ErroreHttp(400, 'link_non_valido', 'Il link non è valido o è già stato usato')
    // Chi ha ricevuto il link possiede l'e-mail: l'account risulta confermato.
    // Tutte le sessioni aperte vengono chiuse.
    await db.query('UPDATE utenti SET hash_password = $2, email_confermata = true WHERE id = $1', [
      esito.utente,
      await hashPassword(dati.password),
    ])
    await db.query('DELETE FROM token_utente WHERE utente = $1', [esito.utente])
    res.json({ messaggio: 'Password aggiornata: ora puoi accedere' })
  })

  // ---------- Profilo (UC-08) ----------

  router.get('/me', richiediAccesso, async (req, res) => {
    const [utente] = await db.query('SELECT * FROM utenti WHERE id = $1', [req.utente.id])
    if (!utente) throw new ErroreHttp(401, 'accesso_richiesto', 'Account non più esistente')

    const contributi = await db.query(
      `SELECT c.id, c.testo, c.anno, c.licenza, c.stato, c.motivazione, c.creato_il, c.foto,
              p.id AS poi_id, p.nome AS poi_nome
         FROM contenuti c JOIN poi p ON p.id = c.poi
        WHERE c.autore = $1
        ORDER BY c.creato_il DESC`,
      [req.utente.id],
    )
    const preferiti = await db.query(
      `SELECT f.tipo, f.riferimento, coalesce(p.nome, i.titolo) AS nome, p.categoria
         FROM preferiti f
         LEFT JOIN poi p ON f.tipo = 'poi' AND p.id = f.riferimento
         LEFT JOIN itinerari i ON f.tipo = 'itinerario' AND i.id = f.riferimento
        WHERE f.utente = $1 AND coalesce(p.id, i.id) IS NOT NULL
        ORDER BY f.creato_il DESC`,
      [req.utente.id],
    )

    res.json({
      utente: { ...datiPubblici(utente), creato_il: utente.creato_il },
      contributi: contributi.map((c) => ({
        id: c.id,
        poi: { id: c.poi_id, nome: c.poi_nome },
        testo: c.testo,
        anno: c.anno,
        licenza: c.licenza,
        stato: c.stato,
        motivazione: c.motivazione,
        foto: c.foto,
        creato_il: c.creato_il,
      })),
      preferiti,
    })
  })

  const schemaPreferito = z.object({ tipo: z.enum(['poi', 'itinerario']), riferimento: z.string().min(1).max(100) })

  router.put('/me/preferiti', richiediAccesso, async (req, res) => {
    const { tipo, riferimento } = valida(schemaPreferito, req.body)
    const tabella = tipo === 'poi' ? 'poi' : 'itinerari'
    const [esiste] = await db.query(`SELECT 1 FROM ${tabella} WHERE id = $1`, [riferimento])
    if (!esiste) throw nonTrovato(tipo === 'poi' ? 'Luogo' : 'Itinerario')
    await db.query(
      'INSERT INTO preferiti (utente, tipo, riferimento) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.utente.id, tipo, riferimento],
    )
    res.status(204).end()
  })

  router.delete('/me/preferiti/:tipo/:riferimento', richiediAccesso, async (req, res) => {
    const { tipo, riferimento } = valida(schemaPreferito, req.params)
    await db.query('DELETE FROM preferiti WHERE utente = $1 AND tipo = $2 AND riferimento = $3', [req.utente.id, tipo, riferimento])
    res.status(204).end()
  })

  // Eliminazione dell'account (RF-13, RNF-S04): i dati personali vengono cancellati subito.
  const schemaElimina = z.object({
    password: z.string().min(1, 'Inserisci la password'),
    contributi: z.enum(['rimuovi', 'anonimi'], { error: 'Scegli cosa fare dei tuoi contributi' }),
  })

  router.delete('/me', richiediAccesso, async (req, res) => {
    const dati = valida(schemaElimina, req.body)
    const [utente] = await db.query('SELECT * FROM utenti WHERE id = $1', [req.utente.id])
    if (!utente) throw new ErroreHttp(401, 'accesso_richiesto', 'Account non più esistente')
    if (!(await verificaPassword(dati.password, utente.hash_password))) {
      throw new ErroreHttp(403, 'password_errata', 'Password non corretta', { campi: { password: 'Password non corretta' } })
    }
    if (utente.ruolo === 'amministratore') {
      const [{ n }] = await db.query('SELECT count(*)::int AS n FROM utenti WHERE ruolo = \'amministratore\'')
      if (n <= 1) {
        throw new ErroreHttp(409, 'unico_amministratore', 'Sei l\'unico amministratore: nomina prima un altro amministratore')
      }
    }

    const fotoDaEliminare = await db.transazione(async (tx) => {
      let foto = []
      if (dati.contributi === 'rimuovi') {
        foto = await tx.query(
          `DELETE FROM contenuti c WHERE c.autore = $1 RETURNING c.foto AS id,
             (SELECT area FROM foto WHERE id = c.foto) AS area`,
          [utente.id],
        )
        const ids = foto.map((f) => f.id).filter(Boolean)
        if (ids.length) await tx.query('DELETE FROM foto WHERE id = ANY($1::uuid[])', [ids])
      }
      // Con "anonimi" i contributi restano e l'autore diventa NULL (ON DELETE SET NULL)
      await tx.query('DELETE FROM utenti WHERE id = $1', [utente.id])
      return foto.filter((f) => f.id)
    })
    for (const f of fotoDaEliminare) await archivio.elimina(f.area, f.id)

    await posta.inviaSenzaBloccare({
      a: utente.email,
      oggetto: 'Il tuo account Discover Tridentum è stato eliminato',
      testo:
        `Ciao ${utente.nome_visualizzato},\n\n` +
        'come richiesto abbiamo eliminato il tuo account e i tuoi dati personali. ' +
        (dati.contributi === 'rimuovi'
          ? 'Abbiamo rimosso anche i tuoi contributi.'
          : 'I contributi già pubblicati restano visibili in forma anonima.'),
    })
    cancellaCookie(res)
    res.status(204).end()
  })

  // ---------- Gestione dei ruoli (UC-09) ----------

  const soloAmministratori = richiediRuolo(db, 'amministratore')

  router.get('/admin/utenti', soloAmministratori, async (req, res) => {
    const q = String(req.query.q ?? '').trim().toLowerCase()
    const utenti = await db.query(
      `SELECT u.id, u.nome_visualizzato AS nome, u.email, u.ruolo, u.email_confermata, u.creato_il,
              (SELECT count(*)::int FROM contenuti c WHERE c.autore = u.id) AS contributi
         FROM utenti u
        WHERE $1 = '' OR lower(u.nome_visualizzato) LIKE '%' || $1 || '%' OR u.email LIKE '%' || $1 || '%'
        ORDER BY u.creato_il DESC
        LIMIT 50`,
      [q],
    )
    res.json(utenti)
  })

  router.put('/admin/utenti/:id/ruolo', soloAmministratori, async (req, res) => {
    const { ruolo } = valida(z.object({ ruolo: z.enum(['utente', 'moderatore']) }), req.body)
    const id = valida(z.uuid('Utente non valido'), req.params.id)
    const [utente] = await db.query('SELECT * FROM utenti WHERE id = $1', [id])
    // E2: l'utente è stato eliminato nel frattempo
    if (!utente) throw nonTrovato('Utente')
    if (utente.ruolo === 'amministratore') {
      throw new ErroreHttp(409, 'ruolo_non_modificabile', 'Il ruolo di un amministratore non si cambia da qui')
    }
    if (utente.ruolo !== ruolo) {
      await db.query('UPDATE utenti SET ruolo = $2 WHERE id = $1', [id, ruolo])
      await posta.inviaSenzaBloccare({
        a: utente.email,
        oggetto: ruolo === 'moderatore' ? 'Sei diventato moderatore di Discover Tridentum' : 'Il tuo ruolo di moderatore è stato revocato',
        testo:
          `Ciao ${utente.nome_visualizzato},\n\n` +
          (ruolo === 'moderatore'
            ? 'un amministratore ti ha assegnato il ruolo di moderatore: trovi la coda di moderazione nel tuo profilo.'
            : 'un amministratore ha revocato il tuo ruolo di moderatore.'),
      })
    }
    res.json({ id, ruolo })
  })

  return router
}
