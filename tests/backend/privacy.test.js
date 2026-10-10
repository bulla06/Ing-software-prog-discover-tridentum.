// RNF-S04 Conformità al GDPR: informativa, accesso ai propri dati, rettifica, tempi di conservazione
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CONSERVAZIONE, pulisci } from '../../versione-corrente/backend/src/servizi/pulizia.js'
import { ACCOUNT, accedi, creaAmbiente } from './ambiente.js'

let amb
let utente
beforeAll(async () => {
  amb = await creaAmbiente()
  utente = await accedi(amb.app, ACCOUNT.utente)
})
afterAll(() => amb.chiudi())

describe('informativa', () => {
  it('espone i tempi di conservazione applicati dal server', async () => {
    const r = await amb.api().get('/api/informazioni')
    expect(r.status).toBe(200)
    expect(r.body.conservazione).toEqual(CONSERVAZIONE)
    expect(r.body).toHaveProperty('contatto_privacy')
  })
})

describe('diritti dell\'interessato', () => {
  it('scarica tutti i propri dati in JSON (accesso e portabilità)', async () => {
    await amb.api().put('/api/me/preferiti').set(utente).send({ tipo: 'poi', riferimento: 'duomo' })
    const r = await amb.api().get('/api/me/dati').set(utente)
    expect(r.status).toBe(200)
    expect(r.headers['content-disposition']).toMatch(/attachment/)
    expect(r.body.account).toMatchObject({ email: ACCOUNT.utente.email, nome_visualizzato: 'Utente di prova', ruolo: 'utente' })
    expect(r.body.account.consenso_privacy_il).toBeTruthy()
    expect(r.body.account).not.toHaveProperty('hash_password')
    expect(r.body.contributi.map((c) => c.stato).sort()).toEqual(['approvato', 'in_attesa'])
    expect(r.body.preferiti).toEqual([expect.objectContaining({ tipo: 'poi', riferimento: 'duomo' })])
    expect(r.body.partite).toEqual([])
  })

  it('corregge il nome visualizzato (rettifica)', async () => {
    expect((await amb.api().patch('/api/me').set(utente).send({ nome: 'X' })).status).toBe(400)
    const r = await amb.api().patch('/api/me').set(utente).send({ nome: '  Giulia B.  ' })
    expect(r.status).toBe(200)
    expect(r.body.utente.nome).toBe('Giulia B.')
    expect((await amb.api().get('/api/poi/nettuno')).body.ricordi[0].autore).toBe('Giulia B.')
  })
})

describe('tempi di conservazione', () => {
  const giorniFa = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

  it('cancella account mai confermati, sessioni scadute e ricordi non pubblicati vecchi, con le foto', async () => {
    const nuovoUtente = (email, creato) =>
      amb.db.query(
        `INSERT INTO utenti (nome_visualizzato, email, hash_password, consenso_privacy_il, creato_il)
         VALUES ('Prova', $1, 'x', now(), $2) RETURNING id`,
        [email, creato],
      )
    await nuovoUtente('vecchio@esempio.test', giorniFa(CONSERVAZIONE.account_non_confermati_giorni + 1))
    await nuovoUtente('recente@esempio.test', giorniFa(2))
    const [{ id: idUtente }] = await amb.db.query('SELECT id FROM utenti WHERE email = $1', [ACCOUNT.utente.email])
    await amb.db.query(
      "INSERT INTO token_utente (hash, utente, tipo, scade_il) VALUES ('scaduto', $1, 'rinnovo', now() - interval '1 day')",
      [idUtente],
    )

    // Un ricordo rifiutato da più di 90 giorni, con una foto, e uno rifiutato di recente
    const immagine = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#a8391f' } }).jpeg().toBuffer()
    const carica = async () => {
      const r = await amb.api().post('/api/poi/duomo/contenuti').set(utente).field('licenza', 'cc-by')
        .attach('foto', immagine, { filename: 'f.jpg', contentType: 'image/jpeg' })
      return r.body.id
    }
    const vecchio = await carica()
    const recente = await carica()
    const rifiuta = (id, quando) =>
      amb.db.query("UPDATE contenuti SET stato = 'rifiutato', motivazione = 'Prova', moderato_il = $2 WHERE id = $1", [id, quando])
    await rifiuta(vecchio, giorniFa(CONSERVAZIONE.contenuti_non_pubblicati_giorni + 1))
    await rifiuta(recente, giorniFa(10))
    const [{ foto }] = await amb.db.query('SELECT foto FROM contenuti WHERE id = $1', [vecchio])

    const esito = await pulisci(amb.db, amb.archivio)
    expect(esito).toMatchObject({ account: 1, contenuti: 1 })
    expect(esito.token).toBeGreaterThanOrEqual(1)

    const email = (await amb.db.query('SELECT email FROM utenti')).map((r) => r.email)
    expect(email).not.toContain('vecchio@esempio.test')
    expect(email).toContain('recente@esempio.test')
    expect(await amb.db.query("SELECT 1 FROM token_utente WHERE hash = 'scaduto'")).toHaveLength(0)
    expect(await amb.db.query('SELECT 1 FROM contenuti WHERE id = $1', [vecchio])).toHaveLength(0)
    expect(await amb.db.query('SELECT 1 FROM contenuti WHERE id = $1', [recente])).toHaveLength(1)
    await expect(amb.archivio.leggi('privata', foto, 'standard')).rejects.toThrow()
  })
})
