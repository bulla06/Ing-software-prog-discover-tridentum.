// Dati iniziali: i luoghi curati dal team (db/dati/*.json) e, solo in sviluppo,
// alcuni account e ricordi di prova per provare moderazione e amministrazione.
// Si esegue all'avvio e inserisce i dati solo se le tabelle sono vuote.

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from '../servizi/password.js'

const CARTELLA_DATI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dati')

const leggiJson = async (nome) => JSON.parse(await readFile(path.join(CARTELLA_DATI, nome), 'utf8'))

/** Account di prova: esistono solo se DATI_DIMOSTRATIVI è attivo (predefinito in sviluppo). */
export const ACCOUNT_DIMOSTRATIVI = [
  { email: 'amministratore@tridentum.test', password: 'Tridentum-admin-1', nome: 'Amministratore di prova', ruolo: 'amministratore' },
  { email: 'moderatore@tridentum.test', password: 'Tridentum-moderatore-1', nome: 'Moderatore di prova', ruolo: 'moderatore' },
  { email: 'utente@tridentum.test', password: 'Tridentum-utente-1', nome: 'Utente di prova', ruolo: 'utente' },
]

export async function popola(db, { datiDimostrativi }) {
  const [{ n }] = await db.query('SELECT count(*)::int AS n FROM poi')
  if (n === 0) await inserisciLuoghi(db)

  if (datiDimostrativi) {
    const [{ u }] = await db.query('SELECT count(*)::int AS u FROM utenti')
    if (u === 0) await inserisciDimostrativi(db)
  }
}

async function inserisciLuoghi(db) {
  const [luoghi, itinerari, tradizioni, piatti, gioco] = await Promise.all(
    ['luoghi.json', 'itinerari.json', 'tradizioni.json', 'piatti.json', 'gioco.json'].map(leggiJson),
  )

  await db.transazione(async (tx) => {
    for (const p of luoghi) {
      await tx.query(
        `INSERT INTO poi (id, nome, categoria, temi, posizione, indirizzo, epoca, sintesi, descrizione,
                          affresco_autore, affresco_epoca, piatto_consigliato, parole_chiave, fonti)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9, $10,
                 $11, $12, $13, $14, $15)`,
        [
          p.id, p.nome, p.categoria, p.temi, p.posizione[1], p.posizione[0], p.indirizzo ?? '', p.epoca ?? '',
          p.sintesi, p.descrizione, p.affresco?.autore ?? null, p.affresco?.epoca ?? null,
          p.piatto_consigliato ?? null, p.parole_chiave ?? [], JSON.stringify(p.fonti),
        ],
      )
    }
    for (const it of itinerari) {
      await tx.query(
        'INSERT INTO itinerari (id, titolo, tema, durata_minuti, descrizione) VALUES ($1, $2, $3, $4, $5)',
        [it.id, it.titolo, it.tema, it.durata_minuti, it.descrizione],
      )
      for (const [i, poi] of it.tappe.entries()) {
        await tx.query('INSERT INTO tappe (itinerario, ordine, poi) VALUES ($1, $2, $3)', [it.id, i + 1, poi])
      }
    }
    for (const t of tradizioni) {
      await tx.query(
        'INSERT INTO tradizioni (id, nome, periodo, mesi, descrizione) VALUES ($1, $2, $3, $4, $5)',
        [t.id, t.nome, t.periodo, t.mesi, t.descrizione],
      )
      for (const poi of t.luoghi) {
        await tx.query('INSERT INTO tradizioni_poi (tradizione, poi) VALUES ($1, $2)', [t.id, poi])
      }
    }
    for (const [i, piatto] of piatti.entries()) {
      await tx.query(
        'INSERT INTO piatti (id, nome, tipo, descrizione, ordine) VALUES ($1, $2, $3, $4, $5)',
        [piatto.id, piatto.nome, piatto.tipo, piatto.descrizione, i],
      )
    }
    for (const l of gioco) {
      await tx.query('INSERT INTO livelli_gioco (id, poi, indizio, anno) VALUES ($1, $2, $3, $4)', [l.id, l.poi, l.indizio, l.anno])
    }
  })
}

async function inserisciDimostrativi(db) {
  const ids = {}
  for (const a of ACCOUNT_DIMOSTRATIVI) {
    const [riga] = await db.query(
      `INSERT INTO utenti (nome_visualizzato, email, hash_password, ruolo, email_confermata, consenso_privacy_il)
       VALUES ($1, $2, $3, $4, true, now()) RETURNING id`,
      [a.nome, a.email, await hashPassword(a.password), a.ruolo],
    )
    ids[a.ruolo] = riga.id
  }

  // Un ricordo già pubblicato e uno in coda, per vedere subito scheda e moderazione
  await db.query(
    `INSERT INTO contenuti (poi, autore, testo, anno, licenza, stato, moderato_da, moderato_il)
     VALUES ('nettuno', $1, $2, 'anni ''80', 'cc-by', 'approvato', $3, now())`,
    [ids.utente, 'Ricordo di prova: da bambino mi davano appuntamento "al Nettuno" la domenica pomeriggio. Questo testo serve solo a vedere come appare un ricordo pubblicato.', ids.moderatore],
  )
  await db.query(
    `INSERT INTO contenuti (poi, autore, testo, anno, licenza)
     VALUES ('torre-vanga', $1, $2, '1960 circa', 'cc-by')`,
    [ids.utente, 'Ricordo di prova in attesa di moderazione: accedi come moderatore per approvarlo o rifiutarlo.'],
  )
}
