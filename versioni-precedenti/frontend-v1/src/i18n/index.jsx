import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import it from './it.js'
import en from './en.js'
import { leggi, scrivi } from '../lib/memoria.js'

export const LINGUE = { it: 'Italiano', en: 'English' }
const TESTI = { it, en }

const LinguaContext = createContext(null)

function linguaIniziale() {
  const salvata = leggi('lingua', null)
  if (salvata in TESTI) return salvata
  return navigator.language?.startsWith('it') ? 'it' : 'en'
}

export function LinguaProvider({ children }) {
  const [lingua, setLingua] = useState(linguaIniziale)

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
