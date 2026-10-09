// Connessione al database PostgreSQL + PostGIS (Fase 3, D-05).
//
// - Con DATABASE_URL: server PostgreSQL vero (Docker Compose, produzione).
// - Senza: PGlite, PostgreSQL compilato in WebAssembly ed eseguito dentro Node.
//   Stesso SQL e stessa estensione PostGIS, ma nessuna installazione: basta npm install.
//
// Il resto del backend vede solo questa interfaccia:
//   query(sql, parametri) → righe · esegui(sql) · transazione(fn) · chiudi()

import path from 'node:path'
import { mkdir } from 'node:fs/promises'

export async function apriDatabase({ databaseUrl, cartellaDati }) {
  if (databaseUrl) return apriPostgresql(databaseUrl)
  return apriPglite(cartellaDati)
}

async function apriPostgresql(databaseUrl) {
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 })

  return {
    tipo: 'postgresql',
    query: async (sql, parametri = []) => (await pool.query(sql, parametri)).rows,
    esegui: async (sql) => {
      await pool.query(sql)
    },
    async transazione(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const risultato = await fn({ query: async (sql, p = []) => (await client.query(sql, p)).rows })
        await client.query('COMMIT')
        return risultato
      } catch (errore) {
        await client.query('ROLLBACK')
        throw errore
      } finally {
        client.release()
      }
    },
    chiudi: () => pool.end(),
  }
}

async function apriPglite(cartellaDati) {
  const { PGlite } = await import('@electric-sql/pglite')
  const { postgis } = await import('@electric-sql/pglite-postgis')

  // Senza cartella (test) il database vive solo in memoria
  let dataDir
  if (cartellaDati) {
    dataDir = path.join(cartellaDati, 'database')
    await mkdir(dataDir, { recursive: true })
  }
  const db = await PGlite.create({ dataDir, extensions: { postgis } })

  return {
    tipo: 'pglite',
    query: async (sql, parametri = []) => (await db.query(sql, parametri)).rows,
    esegui: async (sql) => {
      await db.exec(sql)
    },
    transazione: (fn) => db.transaction((tx) => fn({ query: async (sql, p = []) => (await tx.query(sql, p)).rows })),
    chiudi: () => db.close(),
  }
}
