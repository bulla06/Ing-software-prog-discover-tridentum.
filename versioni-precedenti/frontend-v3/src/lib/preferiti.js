import { useCallback, useEffect, useState } from 'react'
import { getProfilo, salvaPreferito, togliPreferito } from '../data/api.js'
import { useSessione } from './sessione.jsx'

/** Luoghi e itinerari salvati dall'utente (RF-09), letti e scritti sul server */
export function usePreferiti() {
  const { utente } = useSessione()
  const [preferiti, setPreferiti] = useState([])

  useEffect(() => {
    if (!utente) {
      setPreferiti([])
      return
    }
    getProfilo().then((p) => setPreferiti(p.preferiti), () => {})
  }, [utente])

  const salvato = useCallback(
    (tipo, riferimento) => preferiti.some((p) => p.tipo === tipo && p.riferimento === riferimento),
    [preferiti],
  )

  const alterna = useCallback(
    async (tipo, riferimento) => {
      if (salvato(tipo, riferimento)) {
        await togliPreferito(tipo, riferimento)
        setPreferiti((ps) => ps.filter((p) => !(p.tipo === tipo && p.riferimento === riferimento)))
      } else {
        await salvaPreferito(tipo, riferimento)
        setPreferiti((ps) => [...ps, { tipo, riferimento }])
      }
    },
    [salvato],
  )

  return { salvato, alterna }
}
