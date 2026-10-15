import { erroreDiConnessione } from './http.js'

/** Messaggio da mostrare per un errore dell'API: tradotto se il codice è noto, altrimenti quello del server */
export function messaggioErrore(t, errore) {
  // UC-01 E2: senza connessione sempre lo stesso avviso, in tutte le pagine
  if (erroreDiConnessione(errore)) return t('errore.connessione')
  const chiave = `errore.${errore?.codice}`
  const tradotto = t(chiave)
  return tradotto !== chiave ? tradotto : errore?.message || t('comune.errore')
}
