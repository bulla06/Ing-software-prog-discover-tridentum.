// UC-06 Giocare a "Dov'era?" · RF-21, RF-22
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { punteggio } from '../../src/backend/src/moduli/gioco/rotte.js'
import { ACCOUNT, accedi, creaAmbiente } from './ambiente.js'

let amb
beforeAll(async () => {
  amb = await creaAmbiente()
})
afterAll(() => amb.chiudi())

/** Posizione esatta di ogni livello, letta dal database come farebbe un giocatore perfetto */
async function soluzioni(partita) {
  const posizioni = []
  for (let indice = 0; indice < 5; indice++) {
    const r = await amb.api().post('/api/gioco/verifica').send({ partita, indice, posizione: [46.0667, 11.1214] })
    posizioni.push(r.body.poi.posizione)
  }
  return posizioni
}

describe('punteggio', () => {
  it('vale 1000 sul punto esatto, circa la metà a 200 m, zero oltre 2 km', () => {
    expect(punteggio(0)).toBe(1000)
    expect(punteggio(200)).toBeGreaterThan(480)
    expect(punteggio(200)).toBeLessThan(520)
    expect(punteggio(2001)).toBe(0)
  })
})

describe('partita', () => {
  it('propone 5 livelli senza rivelare dove si trovano', async () => {
    const r = await amb.api().get('/api/gioco/partita')
    expect(r.status).toBe(200)
    expect(r.body.livelli).toHaveLength(5)
    expect(JSON.stringify(r.body.livelli)).not.toMatch(/posizione|poi|46\.0/)
  })

  it('verifica una risposta con la distanza calcolata da PostGIS', async () => {
    const { partita } = (await amb.api().get('/api/gioco/partita')).body
    const [esatta] = await soluzioni(partita)
    const r = await amb.api().post('/api/gioco/verifica').send({ partita, indice: 0, posizione: esatta })
    expect(r.body.metri).toBe(0)
    expect(r.body.punti).toBe(1000)
    expect(r.body.poi.nome).toBeTruthy()
  })

  it('rifiuta un token di partita manomesso', async () => {
    const r = await amb.api().post('/api/gioco/verifica').send({ partita: 'xxxxxxxxxxxx', indice: 0, posizione: [46, 11] })
    expect(r.status).toBe(400)
  })
})

describe('punteggi e classifica (RF-22)', () => {
  it('salva il punteggio solo per chi ha fatto l\'accesso, ricalcolandolo sul server', async () => {
    const { partita } = (await amb.api().get('/api/gioco/partita')).body
    const risposte = await soluzioni(partita)
    expect((await amb.api().post('/api/gioco/punteggi').send({ partita, risposte })).status).toBe(401)

    const auth = await accedi(amb.app, ACCOUNT.utente)
    const r = await amb.api().post('/api/gioco/punteggi').set(auth).send({ partita, risposte })
    expect(r.status).toBe(201)
    expect(r.body).toEqual({ punteggio: 5000, record: 5000, posizione: 1 })

    // La stessa partita non si salva due volte
    expect((await amb.api().post('/api/gioco/punteggi').set(auth).send({ partita, risposte })).status).toBe(409)
  })

  it('mostra la classifica e la posizione dell\'utente', async () => {
    const mod = await accedi(amb.app, ACCOUNT.moderatore)
    const { partita } = (await amb.api().get('/api/gioco/partita')).body
    const lontano = Array(5).fill([46.2, 11.3])
    await amb.api().post('/api/gioco/punteggi').set(mod).send({ partita, risposte: lontano })

    const r = await amb.api().get('/api/gioco/classifica').set(mod)
    expect(r.body.classifica.map((c) => c.nome)).toEqual(['Utente di prova', 'Moderatore di prova'])
    expect(r.body.mia).toEqual({ record: 0, posizione: 2 })
  })
})
