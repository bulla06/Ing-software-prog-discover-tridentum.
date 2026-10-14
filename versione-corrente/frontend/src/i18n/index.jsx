import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import it from './it.js'
import en from './en.js'
import de from './de.js'
import { impostaLingua } from '../lib/http.js'
import { leggi, scrivi } from '../lib/memoria.js'

export const LINGUE = { it: 'Italiano', en: 'English', de: 'Deutsch' }
const TESTI = { it, en, de }

const LinguaContext = createContext(null)

function linguaIniziale() {
  const salvata = leggi('lingua', null)
  // Prima lingua preferita tra quelle disponibili, nell'ordine scelto dall'utente nel browser
  const preferita = (navigator.languages ?? [navigator.language]).map((l) => l?.slice(0, 2)).find((l) => l in TESTI)
  const scelta = salvata in TESTI ? salvata : (preferita ?? 'en')
  // Subito, prima che le pagine chiedano i dati: i contenuti arrivano già nella lingua giusta
  impostaLingua(scelta)
  return scelta
}

export function LinguaProvider({ children }) {
  const [lingua, setLinguaStato] = useState(linguaIniziale)
  const setLingua = useCallback((nuova) => {
    impostaLingua(nuova)
    setLinguaStato(nuova)
  }, [])

  useEffect(() => {
    scrivi('lingua', lingua)
    document.documentElement.lang = lingua
  }, [lingua])

  return (
    <LinguaContext.Provider value={{ lingua, setLingua }}>{children}</LinguaContext.Provider>
  )
}

/** Restituisce `t(chiave, valori)` per tradurre, la lingua attuale e il modo di cambiarla. */
export function useT() {
  const { lingua, setLingua } = useContext(LinguaContext)
  // Stessa funzione finché non cambia la lingua: si può usare tra le dipendenze degli effetti
  const t = useCallback(
    (chiave, valori = {}) => {
      const testo = TESTI[lingua][chiave] ?? TESTI.it[chiave] ?? chiave
      return testo.replace(/\{(\w+)\}/g, (_, k) => valori[k] ?? '')
    },
    [lingua],
  )
  return { t, lingua, setLingua }
}
