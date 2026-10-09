// Nomina amministratore un utente già registrato (UC-09 non permette di farlo dal sito).
// Serve per il primo amministratore in produzione:
//   npm run crea-amministratore -- persona@esempio.it
// L'account viene anche segnato come confermato, nel caso le e-mail non siano ancora configurate.

import { leggiConfigurazione } from '../config.js'
import { apriDatabase } from '../db/connessione.js'
import { migra } from '../db/migra.js'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Uso: npm run crea-amministratore -- indirizzo@email')
  process.exit(1)
}

const db = await apriDatabase(leggiConfigurazione())
try {
  await migra(db)
  const [utente] = await db.query(
    `UPDATE utenti SET ruolo = 'amministratore', email_confermata = true WHERE email = $1 RETURNING nome_visualizzato`,
    [email],
  )
  if (utente) {
    console.log(`${utente.nome_visualizzato} (${email}) ora è amministratore.`)
  } else {
    console.error(`Nessun utente registrato con l'e-mail ${email}: registrati prima dal sito.`)
    process.exitCode = 1
  }
} finally {
  await db.chiudi()
}
