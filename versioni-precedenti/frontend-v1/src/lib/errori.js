/** Messaggio da mostrare per un errore dell'API: tradotto se il codice è noto, altrimenti quello del server */
export function messaggioErrore(t, errore) {
  const chiave = `errore.${errore?.codice}`
  const tradotto = t(chiave)
  return tradotto !== chiave ? tradotto : errore?.message || t('comune.errore')
}
