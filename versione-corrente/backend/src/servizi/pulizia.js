// Tempi di conservazione dei dati (RNF-S04, GDPR art. 5: limitazione della conservazione).
// Una volta al giorno il server cancella i dati che non servono più. Gli stessi tempi sono scritti
// nell'informativa privacy, che li legge da GET /api/informazioni.

export const CONSERVAZIONE = {
  // Account mai confermati: chi si è registrato non ha aperto il link entro questo tempo
  account_non_confermati_giorni: 30,
  // Ricordi rifiutati o rimossi dopo una segnalazione, con le loro foto
  contenuti_non_pubblicati_giorni: 90,
  // Sessioni: il token di rinnovo scade dopo 30 giorni senza uso
  sessione_giorni: 30,
}

const UN_GIORNO_MS = 24 * 60 * 60 * 1000

/** Cancella i dati scaduti; restituisce quante righe ha tolto, per il registro */
export async function pulisci(db, archivio) {
  const token = await db.query('DELETE FROM token_utente WHERE scade_il < now() RETURNING 1')
  const account = await db.query(
    `DELETE FROM utenti WHERE NOT email_confermata AND creato_il < now() - make_interval(days => $1) RETURNING 1`,
    [CONSERVAZIONE.account_non_confermati_giorni],
  )
  const contenuti = await db.transazione(async (tx) => {
    const righe = await tx.query(
      `DELETE FROM contenuti c
        WHERE c.stato IN ('rifiutato', 'rimosso') AND c.moderato_il < now() - make_interval(days => $1)
        RETURNING c.foto AS id, (SELECT area FROM foto WHERE id = c.foto) AS area`,
      [CONSERVAZIONE.contenuti_non_pubblicati_giorni],
    )
    const foto = righe.filter((r) => r.id)
    if (foto.length) await tx.query('DELETE FROM foto WHERE id = ANY($1::uuid[])', [foto.map((f) => f.id)])
    return { righe: righe.length, foto }
  })
  for (const f of contenuti.foto) await archivio.elimina(f.area, f.id)
  return { token: token.length, account: account.length, contenuti: contenuti.righe }
}

/** Pulizia all'avvio e poi una volta al giorno; il timer non tiene acceso il processo */
export function avviaPulizia(db, archivio, { registro = console } = {}) {
  const esegui = () =>
    pulisci(db, archivio).then(
      (esito) => {
        if (esito.account || esito.contenuti) {
          registro.log(`Pulizia dei dati scaduti: ${esito.account} account non confermati, ${esito.contenuti} ricordi non pubblicati`)
        }
      },
      (errore) => registro.error('Pulizia dei dati scaduti non riuscita:', errore),
    )
  esegui()
  return setInterval(esegui, UN_GIORNO_MS).unref()
}
