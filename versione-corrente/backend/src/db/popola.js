// Dati iniziali curati dal team e, solo in sviluppo, alcuni account e ricordi di prova
// per provare moderazione e amministrazione.
//
// I dati stanno in pacchetti numerati (cartelle di db/dati, es. "002-affreschi"), come le migrazioni:
// all'avvio si caricano in ordine quelli non ancora caricati. Così un pacchetto nuovo arriva anche
// nei database già esistenti, senza toccare quello che gli amministratori hanno modificato.
//
// Ogni pacchetto può contenere luoghi.json, itinerari.json, tradizioni.json, piatti.json
// e foto.json (foto dei luoghi con autore e licenza; i file stanno nella sottocartella foto/).
// Le voci nuove possono avere le loro traduzioni ("traduzioni": { "en": { ... } }, RNF-U05).
//
// Un pacchetto può anche correggere voci di pacchetti precedenti:
// - correzioni.json: { "luoghi": [{ "id", campi da sostituire... }],
//                      "tradizioni": [{ "id", "aggiungi_luoghi": [...], "descrizione", "descrizione_precedente" }] }.
//   Un luogo già modificato da un amministratore non viene toccato: vale la sua versione. La descrizione
//   di una tradizione cambia solo se è ancora quella indicata in "descrizione_precedente".
// - traduzioni.json: { "luoghi": { id: { "en": {...}, "de": {...} } }, "itinerari": {...}, "tradizioni": {...}, "piatti": {...} }.
//   Ogni lingua si scrive solo nelle voci che non l'hanno ancora (una lingua nuova si aggiunge
//   anche a voci che hanno già l'inglese).
//
// I livelli di "Dov'era?" invece stanno fuori dai pacchetti, in dati/gioco.json con le foto in
// dati/foto-gioco/: il file è la fonte e a ogni avvio il database viene allineato.

import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preparaFoto } from '../servizi/immagini.js'
import { hashPassword } from '../servizi/password.js'

export const CARTELLA_DATI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dati')
const PRIMO_PACCHETTO = '001-luoghi-iniziali'

/** Account di prova: esistono solo se DATI_DIMOSTRATIVI è attivo (predefinito in sviluppo). */
export const ACCOUNT_DIMOSTRATIVI = [
  { email: 'amministratore@tridentum.test', password: 'Tridentum-admin-1', nome: 'Amministratore di prova', ruolo: 'amministratore' },
  { email: 'moderatore@tridentum.test', password: 'Tridentum-moderatore-1', nome: 'Moderatore di prova', ruolo: 'moderatore' },
  { email: 'utente@tridentum.test', password: 'Tridentum-utente-1', nome: 'Utente di prova', ruolo: 'utente' },
]

/** Elenco dei pacchetti di dati, in ordine */
export async function elencaPacchetti(cartella = CARTELLA_DATI) {
  const voci = await readdir(cartella, { withFileTypes: true })
  return voci.filter((v) => v.isDirectory() && /^\d{3}-/.test(v.name)).map((v) => v.name).sort()
}

/** Contenuto di un pacchetto: i file mancanti valgono come elenchi (o oggetti) vuoti */
export async function leggiPacchetto(nome, cartella = CARTELLA_DATI) {
  const leggi = async (file, vuoto = []) => {
    const percorso = path.join(cartella, nome, file)
    return existsSync(percorso) ? JSON.parse(await readFile(percorso, 'utf8')) : vuoto
  }
  const [luoghi, itinerari, tradizioni, piatti, foto, correzioni, traduzioni] = await Promise.all([
    leggi('luoghi.json'),
    leggi('itinerari.json'),
    leggi('tradizioni.json'),
    leggi('piatti.json'),
    leggi('foto.json'),
    leggi('correzioni.json', {}),
    leggi('traduzioni.json', {}),
  ])
  return {
    luoghi,
    itinerari,
    tradizioni,
    piatti,
    foto,
    correzioni: { luoghi: correzioni.luoghi ?? [], tradizioni: correzioni.tradizioni ?? [] },
    traduzioni: {
      luoghi: traduzioni.luoghi ?? {},
      itinerari: traduzioni.itinerari ?? {},
      tradizioni: traduzioni.tradizioni ?? {},
      piatti: traduzioni.piatti ?? {},
    },
  }
}

// Campi di un luogo che un pacchetto può correggere, con la colonna e come si scrive il valore
const CORREGGIBILI = {
  nome: ['nome', (v) => v],
  sintesi: ['sintesi', (v) => v],
  descrizione: ['descrizione', (v) => v],
  indirizzo: ['indirizzo', (v) => v],
  epoca: ['epoca', (v) => v],
  temi: ['temi', (v) => v],
  parole_chiave: ['parole_chiave', (v) => v],
  piatto_consigliato: ['piatto_consigliato', (v) => v],
  fonti: ['fonti', (v) => JSON.stringify(v)],
}

export async function popola(db, { datiDimostrativi, archivio }) {
  const caricati = new Set((await db.query('SELECT nome FROM pacchetti_dati')).map((r) => r.nome))

  // Database creato prima dei pacchetti: i luoghi iniziali ci sono già
  if (caricati.size === 0) {
    const [{ n }] = await db.query('SELECT count(*)::int AS n FROM poi')
    if (n > 0) {
      await db.query('INSERT INTO pacchetti_dati (nome) VALUES ($1)', [PRIMO_PACCHETTO])
      caricati.add(PRIMO_PACCHETTO)
    }
  }

  for (const nome of await elencaPacchetti()) {
    if (!caricati.has(nome)) await caricaPacchetto(db, archivio, nome)
  }
  await sincronizzaLivelliGioco(db)

  if (datiDimostrativi) {
    const [{ u }] = await db.query('SELECT count(*)::int AS u FROM utenti')
    if (u === 0) await inserisciDimostrativi(db)
  }
}

async function caricaPacchetto(db, archivio, nome) {
  const { luoghi, itinerari, tradizioni, piatti, foto, correzioni, traduzioni } = await leggiPacchetto(nome)

  // Le foto si preparano prima della transazione (riduzione e rimozione dei metadati)
  const fotoPronte = []
  for (const f of foto) {
    const file = await readFile(path.join(CARTELLA_DATI, nome, 'foto', f.file))
    fotoPronte.push({ ...f, immagine: await preparaFoto(file) })
  }

  const fotoSalvate = await db.transazione(async (tx) => {
    // Un luogo già presente (per esempio modificato da un amministratore) non viene sovrascritto
    for (const p of luoghi) {
      await tx.query(
        `INSERT INTO poi (id, nome, categoria, temi, posizione, indirizzo, epoca, sintesi, descrizione,
                          affresco_autore, affresco_epoca, piatto_consigliato, parole_chiave, fonti, traduzioni)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography, $7, $8, $9, $10,
                 $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        [
          p.id, p.nome, p.categoria, p.temi, p.posizione[1], p.posizione[0], p.indirizzo ?? '', p.epoca ?? '',
          p.sintesi, p.descrizione, p.affresco?.autore ?? null, p.affresco?.epoca ?? null,
          p.piatto_consigliato ?? null, p.parole_chiave ?? [], JSON.stringify(p.fonti), JSON.stringify(p.traduzioni ?? {}),
        ],
      )
    }

    // Correzioni a luoghi di pacchetti precedenti, solo se nessun amministratore li ha modificati
    // (alla creazione aggiornato_il e creato_il coincidono)
    for (const { id, affresco, ...campi } of correzioni.luoghi) {
      const colonne = []
      const valori = [id]
      for (const [campo, valore] of Object.entries(campi)) {
        if (!CORREGGIBILI[campo]) throw new Error(`Pacchetto ${nome}: il campo "${campo}" non si può correggere`)
        const [colonna, converti] = CORREGGIBILI[campo]
        valori.push(converti(valore))
        colonne.push(`${colonna} = $${valori.length}`)
      }
      if (affresco !== undefined) {
        valori.push(affresco?.autore ?? null, affresco?.epoca ?? null)
        colonne.push(`affresco_autore = $${valori.length - 1}`, `affresco_epoca = $${valori.length}`)
      }
      if (!colonne.length) continue
      await tx.query(`UPDATE poi SET ${colonne.join(', ')} WHERE id = $1 AND aggiornato_il = creato_il`, valori)
    }
    const esiste = async (id) => (await tx.query('SELECT 1 FROM poi WHERE id = $1', [id])).length > 0

    for (const it of itinerari) {
      const tappe = []
      for (const poi of it.tappe) if (await esiste(poi)) tappe.push(poi)
      const [nuovo] = await tx.query(
        `INSERT INTO itinerari (id, titolo, tema, durata_minuti, descrizione, traduzioni) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [it.id, it.titolo, it.tema, it.durata_minuti, it.descrizione, JSON.stringify(it.traduzioni ?? {})],
      )
      if (!nuovo) continue
      for (const [i, poi] of tappe.entries()) {
        await tx.query('INSERT INTO tappe (itinerario, ordine, poi) VALUES ($1, $2, $3)', [it.id, i + 1, poi])
      }
    }
    for (const t of tradizioni) {
      const [nuova] = await tx.query(
        `INSERT INTO tradizioni (id, nome, periodo, mesi, descrizione, traduzioni) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [t.id, t.nome, t.periodo, t.mesi, t.descrizione, JSON.stringify(t.traduzioni ?? {})],
      )
      if (!nuova) continue
      for (const poi of t.luoghi) {
        if (await esiste(poi)) await tx.query('INSERT INTO tradizioni_poi (tradizione, poi) VALUES ($1, $2)', [t.id, poi])
      }
    }
    // Luoghi da collegare a tradizioni esistenti: si aggiungono, senza togliere quelli scelti dagli amministratori
    for (const t of correzioni.tradizioni) {
      if (t.descrizione && t.descrizione_precedente) {
        await tx.query('UPDATE tradizioni SET descrizione = $2 WHERE id = $1 AND descrizione = $3', [
          t.id, t.descrizione, t.descrizione_precedente,
        ])
      }
      for (const poi of t.aggiungi_luoghi ?? []) {
        await tx.query(
          `INSERT INTO tradizioni_poi (tradizione, poi)
           SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM tradizioni WHERE id = $1) AND EXISTS (SELECT 1 FROM poi WHERE id = $2)
           ON CONFLICT DO NOTHING`,
          [t.id, poi],
        )
      }
    }
    const [{ ultimo }] = await tx.query('SELECT coalesce(max(ordine), -1)::int AS ultimo FROM piatti')
    for (const [i, piatto] of piatti.entries()) {
      await tx.query(
        `INSERT INTO piatti (id, nome, tipo, descrizione, ordine, traduzioni) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [piatto.id, piatto.nome, piatto.tipo, piatto.descrizione, ultimo + 1 + i, JSON.stringify(piatto.traduzioni ?? {})],
      )
    }
    // Traduzioni di voci già presenti, lingua per lingua e solo dove quella lingua non c'è ancora:
    // una traduzione scritta da un amministratore non viene mai toccata
    const TABELLE = { luoghi: 'poi', itinerari: 'itinerari', tradizioni: 'tradizioni', piatti: 'piatti' }
    for (const [chiave, tabella] of Object.entries(TABELLE)) {
      for (const [id, tradotto] of Object.entries(traduzioni[chiave])) {
        for (const [lingua, campi] of Object.entries(tradotto)) {
          await tx.query(
            `UPDATE ${tabella} SET traduzioni = traduzioni || jsonb_build_object($2::text, $3::jsonb) WHERE id = $1 AND NOT (traduzioni ? $2::text)`,
            [id, lingua, JSON.stringify(campi)],
          )
        }
      }
    }
    const salvate = []
    for (const [i, f] of fotoPronte.entries()) {
      if (!(await esiste(f.poi))) continue
      const [riga] = await tx.query(
        'INSERT INTO foto (area, larghezza, altezza) VALUES (\'pubblica\', $1, $2) RETURNING id',
        [f.immagine.larghezza, f.immagine.altezza],
      )
      await tx.query(
        `INSERT INTO foto_poi (foto, poi, ordine, didascalia, autore, licenza, url_licenza, fonte)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [riga.id, f.poi, f.ordine ?? i, f.didascalia ?? '', f.autore, f.licenza, f.url_licenza ?? null, f.fonte ?? null],
      )
      salvate.push({ id: riga.id, immagine: f.immagine })
    }

    await tx.query('INSERT INTO pacchetti_dati (nome) VALUES ($1)', [nome])
    return salvate
  })

  for (const f of fotoSalvate) await archivio.salva('pubblica', f.id, f.immagine)
}

/**
 * Livelli fotografici di "Dov'era?" (db/dati/gioco.json). Non si modificano dal pannello di
 * amministrazione: il file è la fonte, quindi a ogni avvio il database viene allineato
 * (anche un database creato prima che il gioco diventasse fotografico).
 * Si saltano i livelli di luoghi che l'amministratore ha eliminato.
 */
async function sincronizzaLivelliGioco(db) {
  const gioco = JSON.parse(await readFile(path.join(CARTELLA_DATI, 'gioco.json'), 'utf8'))
  await db.transazione(async (tx) => {
    await tx.query('DELETE FROM livelli_gioco WHERE NOT (id = ANY($1))', [gioco.map((l) => l.id)])
    for (const l of gioco) {
      await tx.query(
        `INSERT INTO livelli_gioco (id, poi, anno, foto_file, foto_autore, foto_licenza, foto_fonte)
         SELECT $1, $2, $3, $4, $5, $6, $7 WHERE EXISTS (SELECT 1 FROM poi WHERE id = $2)
         ON CONFLICT (id) DO UPDATE SET poi = $2, anno = $3, foto_file = $4, foto_autore = $5,
                                        foto_licenza = $6, foto_fonte = $7, indizio = ''`,
        [l.id, l.poi, l.anno, l.foto, l.autore, l.licenza, l.fonte],
      )
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
