// Avvio del server: database, migrazioni, dati iniziali, servizi e API.

import path from 'node:path'
import { creaApp } from './app.js'
import { leggiConfigurazione } from './config.js'
import { apriDatabase } from './db/connessione.js'
import { migra } from './db/migra.js'
import { ACCOUNT_DIMOSTRATIVI, popola } from './db/popola.js'
import { creaArchivioFoto } from './servizi/archivio-foto.js'
import { creaPosta } from './servizi/posta.js'
import { avviaPulizia } from './servizi/pulizia.js'

const config = leggiConfigurazione()

console.log(`Avvio di Discover Tridentum (${config.sviluppo ? 'sviluppo' : 'produzione'})…`)
const db = await apriDatabase(config)
const archivio = await creaArchivioFoto(path.join(config.cartellaDati, 'foto'))
await migra(db)
await popola(db, { ...config, archivio })
avviaPulizia(db, archivio)

const posta = creaPosta(config)
const app = creaApp({ db, config, posta, archivio })

const server = app.listen(config.porta, () => {
  console.log(`\nAPI pronta su http://localhost:${config.porta}/api (database: ${db.tipo === 'pglite' ? 'PGlite' : 'PostgreSQL'})`)
  if (config.sviluppo) console.log(`Apri il sito su ${config.indirizzoPubblico}`)
  if (config.datiDimostrativi) {
    console.log('\nAccount di prova:')
    for (const a of ACCOUNT_DIMOSTRATIVI) console.log(`  ${a.ruolo.padEnd(15)} ${a.email}  ·  ${a.password}`)
  }
  if (!config.sviluppo && !config.contattoPrivacy) {
    console.warn('Attenzione: manca EMAIL_PRIVACY, l\'indirizzo da indicare nell\'informativa privacy (vedi .env.esempio)')
  }
  console.log('')
})

// Chiusura ordinata: PGlite deve chiudere il database per non perdere dati
async function chiudi() {
  server.close()
  await db.chiudi()
  process.exit(0)
}
process.on('SIGINT', chiudi)
process.on('SIGTERM', chiudi)
