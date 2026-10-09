// UC-03 Registrarsi e accedere · UC-08 Gestire il proprio account · UC-09 Gestire i ruoli
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ACCOUNT, accedi, creaAmbiente, tokenDallaPosta } from './ambiente.js'

let amb
beforeAll(async () => {
  amb = await creaAmbiente()
})
afterAll(() => amb.chiudi())

const nuovoUtente = (email) => ({ nome: 'Giulia', email, password: 'Trento2026', privacy: true })

describe('registrazione (UC-03)', () => {
  it('indica i campi da correggere (E2)', async () => {
    const r = await amb.api().post('/api/auth/registrazione').send({ nome: 'G', email: 'non-una-email', password: 'corta', privacy: false })
    expect(r.status).toBe(400)
    expect(Object.keys(r.body.campi).sort()).toEqual(['email', 'nome', 'password', 'privacy'])
  })

  it('crea l\'account, invia il link e attiva l\'account con il link (passi 4–7)', async () => {
    const email = 'giulia@esempio.test'
    const r = await amb.api().post('/api/auth/registrazione').send(nuovoUtente(' Giulia@Esempio.test '))
    expect(r.status).toBe(201)

    // Prima della conferma non si può accedere
    const prima = await amb.api().post('/api/auth/accesso').send({ email, password: 'Trento2026' })
    expect(prima.status).toBe(403)
    expect(prima.body.errore).toBe('email_non_confermata')

    const token = tokenDallaPosta(amb.posta, email)
    expect(token).toBeTruthy()
    const conferma = await amb.api().post('/api/auth/conferma').send({ token })
    expect(conferma.status).toBe(200)
    expect(conferma.body.utente).toMatchObject({ email, nome: 'Giulia', ruolo: 'utente' })
    expect(conferma.body.token).toBeTruthy()
    expect(conferma.headers['set-cookie'][0]).toMatch(/tridentum_rinnovo=.+HttpOnly/)

    // Il link vale una volta sola
    expect((await amb.api().post('/api/auth/conferma').send({ token })).status).toBe(400)
  })

  it('segnala un\'e-mail già registrata (E1)', async () => {
    const r = await amb.api().post('/api/auth/registrazione').send(nuovoUtente(ACCOUNT.utente.email))
    expect(r.status).toBe(409)
    expect(r.body.errore).toBe('email_registrata')
  })

  it('salva la password solo come hash (RNF-S02)', async () => {
    const [riga] = await amb.db.query('SELECT hash_password FROM utenti WHERE email = $1', ['giulia@esempio.test'])
    expect(riga.hash_password).not.toContain('Trento2026')
    expect(riga.hash_password).toMatch(/^\$2[aby]\$/)
  })
})

describe('accesso e sessione', () => {
  it('rifiuta credenziali errate', async () => {
    const r = await amb.api().post('/api/auth/accesso').send({ email: ACCOUNT.utente.email, password: 'sbagliata1' })
    expect(r.status).toBe(401)
  })

  it('blocca i tentativi dopo 5 errori in un minuto (E3)', async () => {
    const email = 'bersaglio@esempio.test'
    const stati = []
    for (let i = 0; i < 6; i++) {
      stati.push((await amb.api().post('/api/auth/accesso').send({ email, password: `errata${i}` })).status)
    }
    expect(stati.slice(0, 5)).toEqual([401, 401, 401, 401, 401])
    expect(stati[5]).toBe(429)
  })

  it('rinnova il token con il cookie e lo sostituisce a ogni uso', async () => {
    const accesso = await amb.api().post('/api/auth/accesso').send({ email: ACCOUNT.utente.email, password: ACCOUNT.utente.password })
    const cookie = accesso.headers['set-cookie'][0].split(';')[0]

    const rinnovo = await amb.api().post('/api/auth/rinnovo').set('Cookie', cookie)
    expect(rinnovo.status).toBe(200)
    expect(rinnovo.body.utente.email).toBe(ACCOUNT.utente.email)

    // Il vecchio cookie non vale più
    expect((await amb.api().post('/api/auth/rinnovo').set('Cookie', cookie)).status).toBe(401)
  })

  it('senza cookie di rinnovo risponde che non c\'è una sessione', async () => {
    expect((await amb.api().post('/api/auth/rinnovo')).status).toBe(204)
  })

  it('rifiuta un token di accesso non valido', async () => {
    const r = await amb.api().get('/api/me').set('Authorization', 'Bearer non-valido')
    expect(r.status).toBe(401)
  })

  it('reimposta la password con il link e chiude le sessioni (1b)', async () => {
    const email = 'giulia@esempio.test'
    await amb.api().post('/api/auth/password-dimenticata').send({ email })
    const token = tokenDallaPosta(amb.posta, email)
    const r = await amb.api().post('/api/auth/reimposta').send({ token, password: 'NuovaPassword9' })
    expect(r.status).toBe(200)
    expect((await amb.api().post('/api/auth/accesso').send({ email, password: 'Trento2026' })).status).toBe(401)
    expect((await amb.api().post('/api/auth/accesso').send({ email, password: 'NuovaPassword9' })).status).toBe(200)
  })

  it('non rivela se un\'e-mail è registrata', async () => {
    const a = await amb.api().post('/api/auth/password-dimenticata').send({ email: 'nessuno@esempio.test' })
    const b = await amb.api().post('/api/auth/password-dimenticata').send({ email: ACCOUNT.utente.email })
    expect(a.status).toBe(200)
    expect(a.body).toEqual(b.body)
  })
})

describe('profilo e preferiti (UC-08)', () => {
  it('mostra contributi con lo stato e i preferiti', async () => {
    const auth = await accedi(amb.app, ACCOUNT.utente)
    expect((await amb.api().put('/api/me/preferiti').set(auth).send({ tipo: 'poi', riferimento: 'duomo' })).status).toBe(204)
    expect((await amb.api().put('/api/me/preferiti').set(auth).send({ tipo: 'poi', riferimento: 'inesistente' })).status).toBe(404)

    const r = await amb.api().get('/api/me').set(auth)
    expect(r.status).toBe(200)
    expect(r.body.preferiti).toEqual([{ tipo: 'poi', riferimento: 'duomo', nome: 'Cattedrale di San Vigilio', categoria: 'storia' }])
    expect(r.body.contributi.map((c) => c.stato).sort()).toEqual(['approvato', 'in_attesa'])

    await amb.api().delete('/api/me/preferiti/poi/duomo').set(auth)
    expect((await amb.api().get('/api/me').set(auth)).body.preferiti).toEqual([])
  })

  it('richiede l\'accesso', async () => {
    expect((await amb.api().get('/api/me')).status).toBe(401)
  })
})

describe('eliminazione dell\'account (RF-13)', () => {
  it('chiede la password corretta (E1)', async () => {
    const auth = await accedi(amb.app, ACCOUNT.utente)
    const r = await amb.api().delete('/api/me').set(auth).send({ password: 'sbagliata', contributi: 'anonimi' })
    expect(r.status).toBe(403)
  })

  it('blocca l\'unico amministratore (E2)', async () => {
    const auth = await accedi(amb.app, ACCOUNT.amministratore)
    const r = await amb.api().delete('/api/me').set(auth).send({ password: ACCOUNT.amministratore.password, contributi: 'anonimi' })
    expect(r.status).toBe(409)
    expect(r.body.errore).toBe('unico_amministratore')
  })

  it('cancella i dati personali e lascia i contributi pubblicati in forma anonima', async () => {
    const auth = await accedi(amb.app, ACCOUNT.utente)
    const r = await amb.api().delete('/api/me').set(auth).send({ password: ACCOUNT.utente.password, contributi: 'anonimi' })
    expect(r.status).toBe(204)

    const utenti = await amb.db.query('SELECT 1 FROM utenti WHERE email = $1', [ACCOUNT.utente.email])
    expect(utenti).toHaveLength(0)
    const scheda = await amb.api().get('/api/poi/nettuno')
    expect(scheda.body.ricordi).toHaveLength(1)
    expect(scheda.body.ricordi[0].autore).toBeNull()
    expect(amb.posta.postaDiProva()[0].oggetto).toMatch(/eliminato/)
  })
})

describe('gestione dei ruoli (UC-09, RNF-S03)', () => {
  it('è riservata agli amministratori', async () => {
    const auth = await accedi(amb.app, ACCOUNT.moderatore)
    expect((await amb.api().get('/api/admin/utenti').set(auth)).status).toBe(403)
    expect((await amb.api().get('/api/admin/utenti')).status).toBe(401)
  })

  it('assegna e revoca il ruolo di moderatore, con effetto dalla richiesta successiva', async () => {
    const admin = await accedi(amb.app, ACCOUNT.amministratore)
    const giulia = await accedi(amb.app, { email: 'giulia@esempio.test', password: 'NuovaPassword9' })
    const [{ id }] = (await amb.api().get('/api/admin/utenti?q=giulia').set(admin)).body

    expect((await amb.api().get('/api/moderazione/coda').set(giulia)).status).toBe(403)
    expect((await amb.api().put(`/api/admin/utenti/${id}/ruolo`).set(admin).send({ ruolo: 'moderatore' })).status).toBe(200)
    // Stesso token di prima: il ruolo si rilegge dal database
    expect((await amb.api().get('/api/moderazione/coda').set(giulia)).status).toBe(200)

    await amb.api().put(`/api/admin/utenti/${id}/ruolo`).set(admin).send({ ruolo: 'utente' })
    expect((await amb.api().get('/api/moderazione/coda').set(giulia)).status).toBe(403)
  })

  it('non permette di nominare amministratori da qui', async () => {
    const admin = await accedi(amb.app, ACCOUNT.amministratore)
    const [{ id }] = (await amb.api().get('/api/admin/utenti?q=giulia').set(admin)).body
    expect((await amb.api().put(`/api/admin/utenti/${id}/ruolo`).set(admin).send({ ruolo: 'amministratore' })).status).toBe(400)
  })
})
