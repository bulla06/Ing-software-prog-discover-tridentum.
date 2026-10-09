// Applica in ordine i file di db/migrazioni non ancora eseguiti.
// Ogni modifica allo schema è un nuovo file numerato: i file già applicati non si toccano.

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CARTELLA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrazioni')

export async function migra(db) {
  await db.esegui(`CREATE TABLE IF NOT EXISTS migrazioni (
    nome text PRIMARY KEY,
    applicata_il timestamptz NOT NULL DEFAULT now()
  )`)
  const applicate = new Set((await db.query('SELECT nome FROM migrazioni')).map((r) => r.nome))
  const file = (await readdir(CARTELLA)).filter((f) => f.endsWith('.sql')).sort()

  for (const nome of file) {
    if (applicate.has(nome)) continue
    const sql = await readFile(path.join(CARTELLA, nome), 'utf8')
    await db.esegui(`BEGIN;\n${sql}\nINSERT INTO migrazioni (nome) VALUES ('${nome}');\nCOMMIT;`)
  }
}
