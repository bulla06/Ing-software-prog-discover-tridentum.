// Ambiente di prova: database PGlite in memoria, archivio foto in una cartella temporanea,
// posta di prova al posto delle e-mail vere.
//
// Con TEST_DATABASE_URL (es. postgres://utente:password@localhost:5432/postgres) i test girano
// invece su un server PostgreSQL + PostGIS vero: ogni file crea un database nuovo e lo elimina alla fine.

import { randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import pg from 'pg'
import request from 'supertest'
import { creaApp } from '../../src/backend/src/app.js'
import { leggiConfigurazione } from '../../src/backend/src/config.js'
import { apriDatabase } from '../../src/backend/src/db/connessione.js'
import { migra } from '../../src/backend/src/db/migra.js'
import { ACCOUNT_DIMOSTRATIVI, popola } from '../../src/backend/src/db/popola.js'
import { creaArchivioFoto } from '../../src/backend/src/servizi/archivio-foto.js'
import { creaPosta } from '../../src/backend/src/servizi/posta.js'

export const ACCOUNT = Object.fromEntries(ACCOUNT_DIMOSTRATIVI.map((a) => [a.ruolo, a]))

/** Crea un database vuoto sul server indicato da TEST_DATABASE_URL e restituisce come raggiungerlo e rimuoverlo */
async function databaseTemporaneo(urlServer) {
  const nome = `tridentum_test_${randomBytes(4).toString('hex')}`
  const amministra = async (sql) => {
    const client = new pg.Client({ connectionString: urlServer })
    await client.connect()
    await client.query(sql)
    await client.end()
  }
  await amministra(`CREATE DATABASE ${nome}`)
  const url = new URL(urlServer)
  url.pathname = `/${nome}`
  return { url: url.toString(), elimina: () => amministra(`DROP DATABASE ${nome} WITH (FORCE)`) }
}

export async function creaAmbiente() {
  const temporaneo = process.env.TEST_DATABASE_URL ? await databaseTemporaneo(process.env.TEST_DATABASE_URL) : null
  const config = {
    ...leggiConfigurazione({}),
    databaseUrl: temporaneo?.url ?? null,
    cartellaDati: null,
    cartellaFrontend: '/inesistente',
  }
  const db = await apriDatabase(config)
  const cartellaFoto = await mkdtemp(path.join(tmpdir(), 'tridentum-foto-'))
  const archivio = await creaArchivioFoto(cartellaFoto)
  await migra(db)
  await popola(db, { datiDimostrativi: true, archivio })
  const posta = creaPosta({ sviluppo: true })
  const app = creaApp({ db, config, posta, archivio, registro: false })

  return {
    app,
    db,
    posta,
    archivio,
    api: () => request(app),
    async chiudi() {
      await db.chiudi()
      await temporaneo?.elimina()
      await rm(cartellaFoto, { recursive: true, force: true })
    },
  }
}

/** Effettua l'accesso e restituisce l'intestazione Authorization da usare nelle richieste */
export async function accedi(app, { email, password }) {
  const risposta = await request(app).post('/api/auth/accesso').send({ email, password })
  if (risposta.status !== 200) throw new Error(`Accesso fallito per ${email}: ${risposta.status} ${JSON.stringify(risposta.body)}`)
  return { Authorization: `Bearer ${risposta.body.token}` }
}

/** Estrae il token dal link contenuto nell'ultima e-mail inviata a un indirizzo */
export function tokenDallaPosta(posta, indirizzo) {
  const email = posta.postaDiProva().find((e) => e.a === indirizzo)
  return email?.testo.match(/token=([\w-]+)/)?.[1] ?? null
}
