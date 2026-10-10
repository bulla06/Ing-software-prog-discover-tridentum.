// RNF-S03 Controllo degli accessi per ruolo: ogni rotta riservata rifiuta chi non ha il ruolo giusto.
// Le richieste di chi ha il ruolo usano dati non validi o voci inesistenti: si controlla solo che
// il gateway le lasci passare, senza modificare niente.
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ACCOUNT, accedi, creaAmbiente } from './ambiente.js'

let amb
const auth = {}
beforeAll(async () => {
  amb = await creaAmbiente()
  for (const ruolo of ['utente', 'moderatore', 'amministratore']) auth[ruolo] = await accedi(amb.app, ACCOUNT[ruolo])
})
afterAll(() => amb.chiudi())

const uuid = randomUUID()

// [metodo, percorso, ruolo minimo]
const ROTTE = [
  // Amministrazione (UC-07, UC-09, RNF-PO04)
  ['get', '/api/admin/poi', 'amministratore'],
  ['post', '/api/admin/poi', 'amministratore'],
  ['put', '/api/admin/poi/inesistente', 'amministratore'],
  ['delete', '/api/admin/poi/inesistente', 'amministratore'],
  ['post', '/api/admin/poi/inesistente/foto', 'amministratore'],
  ['delete', `/api/admin/poi/inesistente/foto/${uuid}`, 'amministratore'],
  ['get', '/api/admin/itinerari', 'amministratore'],
  ['post', '/api/admin/itinerari', 'amministratore'],
  ['put', '/api/admin/itinerari/inesistente', 'amministratore'],
  ['delete', '/api/admin/itinerari/inesistente', 'amministratore'],
  ['get', '/api/admin/tradizioni', 'amministratore'],
  ['post', '/api/admin/tradizioni', 'amministratore'],
  ['put', '/api/admin/tradizioni/inesistente', 'amministratore'],
  ['delete', '/api/admin/tradizioni/inesistente', 'amministratore'],
  ['post', '/api/admin/importa/poi', 'amministratore'],
  ['post', '/api/admin/importa/itinerari', 'amministratore'],
  ['get', '/api/admin/utenti', 'amministratore'],
  ['put', `/api/admin/utenti/${uuid}/ruolo`, 'amministratore'],
  // Moderazione (UC-05)
  ['get', '/api/moderazione/coda', 'moderatore'],
  ['post', `/api/moderazione/contenuti/${uuid}/decisione`, 'moderatore'],
  ['post', `/api/moderazione/segnalazioni/${uuid}/decisione`, 'moderatore'],
  // Account (UC-03, UC-04, UC-08, RF-22)
  ['get', '/api/me', 'utente'],
  ['patch', '/api/me', 'utente'],
  ['get', '/api/me/dati', 'utente'],
  ['delete', '/api/me', 'utente'],
  ['put', '/api/me/preferiti', 'utente'],
  ['delete', '/api/me/preferiti/poi/inesistente', 'utente'],
  ['post', '/api/poi/duomo/contenuti', 'utente'],
  ['post', '/api/gioco/punteggi', 'utente'],
]

const LIVELLO = { utente: 1, moderatore: 2, amministratore: 3 }
const richiesta = (metodo, percorso, intestazioni = {}) => amb.api()[metodo](percorso).set(intestazioni).send({})

describe('controllo degli accessi per ruolo (RNF-S03)', () => {
  it.each(ROTTE)('%s %s: 401 senza accesso', async (metodo, percorso) => {
    expect((await richiesta(metodo, percorso)).status).toBe(401)
  })

  it.each(ROTTE.filter(([, , minimo]) => LIVELLO[minimo] > 1))('%s %s: 403 per chi non ha il ruolo', async (metodo, percorso, minimo) => {
    for (const ruolo of Object.keys(LIVELLO).filter((r) => LIVELLO[r] < LIVELLO[minimo])) {
      const r = await richiesta(metodo, percorso, auth[ruolo])
      expect(r.status, ruolo).toBe(403)
      expect(r.body.errore).toBe('ruolo_insufficiente')
    }
  })

  it.each(ROTTE)('%s %s: passa il controllo con il ruolo %s', async (metodo, percorso, minimo) => {
    for (const ruolo of Object.keys(LIVELLO).filter((r) => LIVELLO[r] >= LIVELLO[minimo])) {
      const r = await richiesta(metodo, percorso, auth[ruolo])
      expect([401, 403], `${ruolo}: ${r.status} ${JSON.stringify(r.body)}`).not.toContain(r.status)
    }
  })

  it('un token di accesso falsificato non vale', async () => {
    const [intestazione, corpo] = auth.utente.Authorization.slice(7).split('.')
    const conRuolo = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(corpo, 'base64url')), ruolo: 'amministratore' })).toString('base64url')
    const r = await amb.api().get('/api/admin/utenti').set('Authorization', `Bearer ${intestazione}.${conRuolo}.firma`)
    expect(r.status).toBe(401)
  })
})
