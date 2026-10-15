import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, impostaSessione, rinnova, suCambioUtente } from './http.js'

const SessioneContext = createContext(null)

/**
 * Utente che ha effettuato l'accesso, condiviso tra le pagine.
 * All'apertura del sito la sessione si ripristina con il cookie di rinnovo.
 */
export function SessioneProvider({ children }) {
  const [utente, setUtente] = useState(null)
  const [pronta, setPronta] = useState(false)

  useEffect(() => {
    const smetti = suCambioUtente(setUtente)
    rinnova().finally(() => setPronta(true))
    return smetti
  }, [])

  const accedi = useCallback(async (email, password) => {
    const sessione = await api('POST', '/auth/accesso', { corpo: { email, password } })
    impostaSessione(sessione)
    return sessione.utente
  }, [])

  const confermaEmail = useCallback(async (token) => {
    const sessione = await api('POST', '/auth/conferma', { corpo: { token } })
    impostaSessione(sessione)
    return sessione.utente
  }, [])

  const esci = useCallback(async () => {
    await api('POST', '/auth/uscita').catch(() => {})
    impostaSessione(null)
  }, [])

  const dimentica = useCallback(() => impostaSessione(null), [])

  // Dati dell'utente cambiati dal profilo (es. il nome visualizzato): la sessione resta la stessa
  const aggiorna = useCallback((dati) => setUtente((u) => (u ? { ...u, ...dati } : u)), [])

  return (
    <SessioneContext.Provider value={{ utente, pronta, accedi, confermaEmail, esci, dimentica, aggiorna }}>
      {children}
    </SessioneContext.Provider>
  )
}

export function useSessione() {
  return useContext(SessioneContext)
}

export const puoModerare = (utente) => ['moderatore', 'amministratore'].includes(utente?.ruolo)
export const eAmministratore = (utente) => utente?.ruolo === 'amministratore'
